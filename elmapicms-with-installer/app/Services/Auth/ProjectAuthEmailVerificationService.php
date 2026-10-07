<?php

namespace App\Services\Auth;

use App\Events\ProjectAuthEvent;
use App\Mail\ProjectAuthVerificationMail;
use App\Models\Project;
use App\Models\ProjectAuthEmailVerificationToken;
use App\Models\ProjectAuthUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ProjectAuthEmailVerificationService
{
    public function __construct(public AuthAuditEventService $auditEventService) {}

    public function issueAndSend(Project $project, ProjectAuthUser $authUser, Request $request, bool $force = false): void
    {
        if (! $force) {
            $latest = ProjectAuthEmailVerificationToken::query()
                ->where('project_id', $project->id)
                ->where('project_auth_user_id', $authUser->id)
                ->whereNull('consumed_at')
                ->latest('id')
                ->first();

            if ($latest && $latest->created_at->diffInSeconds(now()) < (int) config('project_auth.verification_resend_cooldown_seconds', 60)) {
                return;
            }
        }

        $rawToken = Str::random(96);

        ProjectAuthEmailVerificationToken::query()
            ->where('project_id', $project->id)
            ->where('project_auth_user_id', $authUser->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        ProjectAuthEmailVerificationToken::query()->create([
            'project_id' => $project->id,
            'project_auth_user_id' => $authUser->id,
            'token_hash' => hash('sha256', $rawToken),
            'email' => (string) $authUser->email,
            'expires_at' => now()->addMinutes((int) config('project_auth.verification_token_ttl_minutes', 60)),
        ]);

        $mailConfig = $this->resolvedMailConfig($project);
        $verificationUrl = $this->buildVerificationUrl($project, $rawToken, $mailConfig);

        Mail::to($authUser->email)->send(
            new ProjectAuthVerificationMail($project, $authUser, $verificationUrl, $mailConfig)
        );

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.email_verification.sent',
            metadata: ['auth_user_uuid' => $authUser->uuid],
            authUser: $authUser,
            request: $request
        );
    }

    public function resendForEmail(Project $project, string $email, Request $request): void
    {
        $authUser = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('email', mb_strtolower(trim($email)))
            ->first();

        if (! $authUser || $authUser->suspended_at || $authUser->email_verified_at) {
            return;
        }

        $this->issueAndSend($project, $authUser, $request);
    }

    public function confirmByToken(Project $project, string $rawToken, Request $request): ?ProjectAuthUser
    {
        $token = ProjectAuthEmailVerificationToken::query()
            ->where('project_id', $project->id)
            ->where('token_hash', hash('sha256', trim($rawToken)))
            ->first();

        if (! $token || $token->consumed_at || $token->expires_at->isPast()) {
            return null;
        }

        $authUser = ProjectAuthUser::query()
            ->where('project_id', $project->id)
            ->where('id', $token->project_auth_user_id)
            ->first();

        if (! $authUser || $authUser->suspended_at) {
            return null;
        }

        $token->consumed_at = now();
        $token->save();

        if (! $authUser->email_verified_at) {
            $authUser->email_verified_at = now();
            $authUser->save();
        }

        $this->auditEventService->log(
            project: $project,
            eventType: 'auth.email_verification.verified',
            metadata: ['auth_user_uuid' => $authUser->uuid],
            authUser: $authUser,
            request: $request
        );

        ProjectAuthEvent::dispatch('auth.email_verification.verified', $project, $authUser);

        return $authUser;
    }

    public function resolvedMailConfig(Project $project): array
    {
        $defaults = config('project_auth.verification_email', []);
        $projectConfig = is_array($project->project_auth_email_verification_config)
            ? $project->project_auth_email_verification_config
            : [];

        return [
            'subject' => (string) ($projectConfig['subject'] ?? $defaults['subject'] ?? 'Verify your email address'),
            'heading' => (string) ($projectConfig['heading'] ?? $defaults['heading'] ?? 'Verify your email address'),
            'intro' => (string) ($projectConfig['intro'] ?? $defaults['intro'] ?? 'Please verify your email address to continue.'),
            'button_text' => (string) ($projectConfig['button_text'] ?? $defaults['button_text'] ?? 'Verify Email'),
            'outro' => (string) ($projectConfig['outro'] ?? $defaults['outro'] ?? 'If you did not create this account, you can safely ignore this email.'),
            'from_name' => (string) ($projectConfig['from_name'] ?? $defaults['from_name'] ?? config('mail.from.name')),
            'from_email' => (string) ($projectConfig['from_email'] ?? $defaults['from_email'] ?? config('mail.from.address')),
            'verification_url_base' => (string) ($projectConfig['verification_url_base'] ?? $defaults['verification_url_base'] ?? config('app.url')),
        ];
    }

    protected function buildVerificationUrl(Project $project, string $rawToken, array $mailConfig): string
    {
        $base = rtrim((string) ($mailConfig['verification_url_base'] ?? config('app.url')), '/');

        return $base.'/auth/verify-email?token='.urlencode($rawToken).'&project_id='.urlencode((string) $project->uuid);
    }
}
