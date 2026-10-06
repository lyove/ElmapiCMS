<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class AuthSecurityGateCheck extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:auth-security-gate-check {--strict : Fail when manual gate flags are missing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Validate project auth security baseline before SaaS rollout';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $checks = [
            'access token ttl <= 15m' => ((int) config('project_auth.access_token_ttl_minutes', 15)) <= 15,
            'refresh token ttl <= 90d' => ((int) config('project_auth.refresh_token_ttl_days', 30)) <= 90,
            'audit retention configured' => ((int) config('project_auth.audit_retention_days', 0)) > 0,
            'auth tables exist' => $this->authTablesExist(),
        ];

        foreach ($checks as $label => $passed) {
            $passed ? $this->info("PASS: {$label}") : $this->error("FAIL: {$label}");
        }

        $manualChecks = [
            'threat_model_completed' => $this->envBool('PROJECT_AUTH_THREAT_MODEL_COMPLETED'),
            'external_review_completed' => $this->envBool('PROJECT_AUTH_EXTERNAL_REVIEW_COMPLETED'),
            'incident_runbook_verified' => $this->envBool('PROJECT_AUTH_INCIDENT_RUNBOOK_VERIFIED'),
        ];

        foreach ($manualChecks as $label => $passed) {
            $text = $passed ? 'PASS' : 'PENDING';
            $message = "{$text}: {$label}";
            $passed ? $this->info($message) : $this->warn($message);
        }

        $failedAutomated = in_array(false, $checks, true);
        $failedManual = $this->option('strict') && in_array(false, $manualChecks, true);

        if ($failedAutomated || $failedManual) {
            $this->error('Auth security gate failed.');

            return self::FAILURE;
        }

        $this->info('Auth security gate passed.');

        return self::SUCCESS;
    }

    protected function authTablesExist(): bool
    {
        return Schema::hasTable('project_auth_users')
            && Schema::hasTable('project_auth_identities')
            && Schema::hasTable('project_auth_sessions')
            && Schema::hasTable('project_auth_refresh_tokens')
            && Schema::hasTable('project_auth_api_keys')
            && Schema::hasTable('project_auth_jwt_keys')
            && Schema::hasTable('project_auth_audit_events');
    }

    protected function envBool(string $name): bool
    {
        return filter_var(env($name, false), FILTER_VALIDATE_BOOL) === true;
    }
}
