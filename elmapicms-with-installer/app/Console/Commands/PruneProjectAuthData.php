<?php

namespace App\Console\Commands;

use App\Models\ProjectAuthAuditEvent;
use App\Models\ProjectAuthAuthorizationCode;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use Illuminate\Console\Command;

class PruneProjectAuthData extends Command
{
    protected $signature = 'app:prune-project-auth-data {--dry-run : Show counts without deleting}';

    protected $description = 'Remove expired sessions, tokens, authorization codes, and old audit events';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $now = now();
        $auditRetentionDays = (int) config('project_auth.audit_retention_days', 90);
        $auditCutoff = $now->copy()->subDays($auditRetentionDays);

        $expiredSessions = ProjectAuthSession::query()
            ->where(function ($q) use ($now) {
                $q->where('expires_at', '<', $now)
                    ->orWhereNotNull('revoked_at');
            })
            ->where('updated_at', '<', $now->copy()->subDays(7))
            ->count();

        $expiredRefreshTokens = ProjectAuthRefreshToken::query()
            ->where(function ($q) use ($now) {
                $q->where('expires_at', '<', $now)
                    ->orWhereNotNull('revoked_at');
            })
            ->where('updated_at', '<', $now->copy()->subDays(7))
            ->count();

        $expiredCodes = ProjectAuthAuthorizationCode::query()
            ->where(function ($q) use ($now) {
                $q->where('expires_at', '<', $now)
                    ->orWhereNotNull('consumed_at');
            })
            ->count();

        $oldAuditEvents = $auditRetentionDays > 0
            ? ProjectAuthAuditEvent::query()->where('occurred_at', '<', $auditCutoff)->count()
            : 0;

        $this->info("Expired sessions: {$expiredSessions}");
        $this->info("Expired refresh tokens: {$expiredRefreshTokens}");
        $this->info("Expired authorization codes: {$expiredCodes}");
        $this->info("Old audit events (>{$auditRetentionDays}d): {$oldAuditEvents}");

        if ($dryRun) {
            $this->warn('Dry run — no data deleted.');

            return self::SUCCESS;
        }

        ProjectAuthRefreshToken::query()
            ->where(function ($q) use ($now) {
                $q->where('expires_at', '<', $now)
                    ->orWhereNotNull('revoked_at');
            })
            ->where('updated_at', '<', $now->copy()->subDays(7))
            ->delete();

        ProjectAuthSession::query()
            ->where(function ($q) use ($now) {
                $q->where('expires_at', '<', $now)
                    ->orWhereNotNull('revoked_at');
            })
            ->where('updated_at', '<', $now->copy()->subDays(7))
            ->delete();

        ProjectAuthAuthorizationCode::query()
            ->where(function ($q) use ($now) {
                $q->where('expires_at', '<', $now)
                    ->orWhereNotNull('consumed_at');
            })
            ->delete();

        if ($auditRetentionDays > 0) {
            ProjectAuthAuditEvent::query()->where('occurred_at', '<', $auditCutoff)->delete();
        }

        $this->info('Pruning complete.');

        return self::SUCCESS;
    }
}
