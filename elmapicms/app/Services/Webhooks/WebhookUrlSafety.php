<?php

namespace App\Services\Webhooks;

use InvalidArgumentException;

class WebhookUrlSafety
{
    public static function isSafe(string $url): bool
    {
        try {
            self::assertSafe($url);

            return true;
        } catch (InvalidArgumentException) {
            return false;
        }
    }

    /**
     * @throws InvalidArgumentException
     */
    public static function assertSafe(string $url): void
    {
        $parsed = parse_url($url);
        if ($parsed === false || ! isset($parsed['scheme'], $parsed['host'])) {
            throw new InvalidArgumentException(__('The URL is not valid.'));
        }

        $scheme = strtolower($parsed['scheme']);
        $allowHttp = (bool) config('webhooks.allow_insecure_http', false);
        $allowedSchemes = $allowHttp ? ['https', 'http'] : ['https'];
        if (! in_array($scheme, $allowedSchemes, true)) {
            throw new InvalidArgumentException(
                $allowHttp
                    ? __('Only HTTP and HTTPS URLs are allowed for webhooks.')
                    : __('Only HTTPS URLs are allowed for webhooks.')
            );
        }

        if (! empty($parsed['user'])) {
            throw new InvalidArgumentException(__('The URL must not contain embedded credentials.'));
        }

        $host = $parsed['host'];

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (self::isBlockedIp($host)) {
                throw new InvalidArgumentException(
                    __('The URL cannot point to a private, loopback, link-local, or reserved address.')
                );
            }

            return;
        }

        $ips = self::resolveHost($host);
        foreach ($ips as $ip) {
            if (self::isBlockedIp($ip)) {
                throw new InvalidArgumentException(
                    __('The URL hostname resolves to a disallowed address.')
                );
            }
        }
    }

    private static function isBlockedIp(string $ip): bool
    {
        $isV4 = (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
        $isV6 = (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);

        if (! $isV4 && ! $isV6) {
            return true;
        }

        $flags = ($isV4 ? FILTER_FLAG_IPV4 : FILTER_FLAG_IPV6)
            | FILTER_FLAG_NO_PRIV_RANGE
            | FILTER_FLAG_NO_RES_RANGE;

        return filter_var($ip, FILTER_VALIDATE_IP, $flags) === false;
    }

    /**
     * @return list<string>
     */
    private static function resolveHost(string $host): array
    {
        $ips = [];

        if (function_exists('dns_get_record')) {
            $aRecords = @dns_get_record($host, DNS_A);
            $aaaaRecords = @dns_get_record($host, DNS_AAAA);
            foreach (array_merge(is_array($aRecords) ? $aRecords : [], is_array($aaaaRecords) ? $aaaaRecords : []) as $record) {
                if (isset($record['ip'])) {
                    $ips[] = $record['ip'];
                }
                if (isset($record['ipv6'])) {
                    $ips[] = $record['ipv6'];
                }
            }
        }

        if ($ips === []) {
            $fallback = @gethostbynamel($host);
            if (is_array($fallback)) {
                foreach ($fallback as $ip) {
                    $ips[] = $ip;
                }
            }
        }

        $ips = array_values(array_unique($ips));

        if ($ips === []) {
            throw new InvalidArgumentException(__('The webhook host could not be resolved.'));
        }

        return $ips;
    }
}
