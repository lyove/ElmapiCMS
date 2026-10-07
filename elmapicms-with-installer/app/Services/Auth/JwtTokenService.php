<?php

namespace App\Services\Auth;

use App\Models\Project;
use App\Models\ProjectAuthJwtKey;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use RuntimeException;

class JwtTokenService
{
    public function issueAccessToken(Project $project, ProjectAuthUser $authUser, ProjectAuthSession $session): array
    {
        $issuedAt = CarbonImmutable::now();
        $expiresAt = $issuedAt->addMinutes((int) config('project_auth.access_token_ttl_minutes', 15));
        $key = $this->ensureActiveKey($project);

        $header = [
            'typ' => 'JWT',
            'alg' => 'RS256',
            'kid' => $key->kid,
        ];

        $payload = [
            'iss' => (string) config('project_auth.issuer'),
            'aud' => $project->uuid,
            'sub' => $authUser->uuid,
            'pid' => $project->uuid,
            'sid' => $session->session_uuid,
            'jti' => (string) Str::uuid(),
            'iat' => $issuedAt->getTimestamp(),
            'nbf' => $issuedAt->getTimestamp(),
            'exp' => $expiresAt->getTimestamp(),
        ];

        return [
            'token' => $this->encode($header, $payload, $this->resolvePrivateKey($key->private_key)),
            'expires_at' => $expiresAt,
            'payload' => $payload,
            'kid' => $key->kid,
        ];
    }

    public function decodeForProject(Project $project, string $jwt): ?array
    {
        [$encodedHeader, $encodedPayload, $encodedSignature] = explode('.', $jwt) + [null, null, null];

        if (! $encodedHeader || ! $encodedPayload || ! $encodedSignature) {
            return null;
        }

        $header = json_decode($this->base64UrlDecode($encodedHeader), true);
        $payload = json_decode($this->base64UrlDecode($encodedPayload), true);

        if (! is_array($header) || ! is_array($payload)) {
            return null;
        }

        if (($header['alg'] ?? null) !== 'RS256' || empty($header['kid'])) {
            return null;
        }

        $key = ProjectAuthJwtKey::query()
            ->where('project_id', $project->id)
            ->where('kid', $header['kid'])
            ->first();

        if (! $key || ! $key->public_key) {
            return null;
        }

        $signedData = $encodedHeader.'.'.$encodedPayload;
        $signature = $this->base64UrlDecode($encodedSignature);

        $verified = openssl_verify($signedData, $signature, $key->public_key, OPENSSL_ALGO_SHA256);

        if ($verified !== 1) {
            return null;
        }

        $now = CarbonImmutable::now()->getTimestamp();

        if (($payload['exp'] ?? 0) < $now || ($payload['nbf'] ?? 0) > $now) {
            return null;
        }

        if (($payload['iss'] ?? null) !== config('project_auth.issuer')) {
            return null;
        }

        if (($payload['aud'] ?? null) !== $project->uuid || ($payload['pid'] ?? null) !== $project->uuid) {
            return null;
        }

        return [
            'header' => $header,
            'payload' => $payload,
            'key' => $key,
        ];
    }

    public function ensureActiveKey(Project $project): ProjectAuthJwtKey
    {
        $now = now();

        $existing = ProjectAuthJwtKey::query()
            ->where('project_id', $project->id)
            ->where('is_active', true)
            ->where(function ($query) use ($now) {
                $query->whereNull('not_before')->orWhere('not_before', '<=', $now);
            })
            ->where(function ($query) use ($now) {
                $query->whereNull('not_after')->orWhere('not_after', '>', $now);
            })
            ->latest('id')
            ->first();

        if ($existing) {
            return $existing;
        }

        $lockKey = "jwt_key_creation:{$project->id}";

        return Cache::lock($lockKey, 10)->block(5, function () use ($project, $now) {
            $recheck = ProjectAuthJwtKey::query()
                ->where('project_id', $project->id)
                ->where('is_active', true)
                ->where(function ($query) use ($now) {
                    $query->whereNull('not_before')->orWhere('not_before', '<=', $now);
                })
                ->where(function ($query) use ($now) {
                    $query->whereNull('not_after')->orWhere('not_after', '>', $now);
                })
                ->latest('id')
                ->first();

            if ($recheck) {
                return $recheck;
            }

            $resource = openssl_pkey_new([
                'private_key_type' => OPENSSL_KEYTYPE_RSA,
                'private_key_bits' => 2048,
            ]);

            if (! $resource) {
                throw new RuntimeException('Unable to generate RSA key pair.');
            }

            openssl_pkey_export($resource, $privateKey);
            $details = openssl_pkey_get_details($resource);

            if (! $details || empty($details['key'])) {
                throw new RuntimeException('Unable to extract RSA public key.');
            }

            return ProjectAuthJwtKey::query()->create([
                'project_id' => $project->id,
                'kid' => 'kid_'.Str::lower(Str::random(24)),
                'algorithm' => 'RS256',
                'public_key' => $details['key'],
                'private_key' => Crypt::encryptString($privateKey),
                'secret' => null,
                'not_before' => $now,
                'not_after' => $now->copy()->addDays((int) config('project_auth.jwt_key_ttl_days', 180)),
                'is_active' => true,
            ]);
        });
    }

    protected function encode(array $header, array $payload, string $privateKey): string
    {
        $encodedHeader = $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR));
        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signedData = $encodedHeader.'.'.$encodedPayload;

        $signature = '';
        $signed = openssl_sign($signedData, $signature, $privateKey, OPENSSL_ALGO_SHA256);

        if (! $signed) {
            throw new RuntimeException('Unable to sign access token.');
        }

        return $signedData.'.'.$this->base64UrlEncode($signature);
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    protected function base64UrlDecode(string $value): string
    {
        $padded = str_pad($value, (int) ceil(strlen($value) / 4) * 4, '=', STR_PAD_RIGHT);

        return (string) base64_decode(strtr($padded, '-_', '+/'), true);
    }

    protected function resolvePrivateKey(?string $storedPrivateKey): string
    {
        if (! $storedPrivateKey) {
            throw new RuntimeException('No private signing key is available.');
        }

        try {
            return Crypt::decryptString($storedPrivateKey);
        } catch (DecryptException $e) {
            throw new RuntimeException('Unable to decrypt JWT signing key. APP_KEY may have been rotated.', 0, $e);
        }
    }
}
