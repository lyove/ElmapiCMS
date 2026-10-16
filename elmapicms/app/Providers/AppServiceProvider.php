<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        RateLimiter::for('api', function (Request $request): Limit {
            return Limit::perMinute((int) config('app.api_rate_limit_per_minute', 300))
                ->by($request->user()?->getAuthIdentifier() ?: $request->ip());
        });

        RateLimiter::for('auth-signup', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();

            return Limit::perMinute(config('project_auth.rate_limits.signup_per_minute'))
                ->by("signup:{$project}:{$ip}");
        });

        RateLimiter::for('auth-signin', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();
            $email = sha1((string) $request->input('email'));

            return Limit::perMinute(config('project_auth.rate_limits.signin_per_minute'))
                ->by("signin:{$project}:{$ip}:{$email}");
        });

        RateLimiter::for('auth-refresh', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();

            return Limit::perMinute(config('project_auth.rate_limits.refresh_per_minute'))
                ->by("refresh:{$project}:{$ip}");
        });

        RateLimiter::for('auth-api-keys', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();

            return Limit::perMinute(config('project_auth.rate_limits.api_keys_per_minute'))
                ->by("auth-api-keys:{$project}:{$ip}");
        });

        RateLimiter::for('auth-api-key-introspect', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();

            return Limit::perMinute(config('project_auth.rate_limits.api_key_introspect_per_minute'))
                ->by("auth-api-key-introspect:{$project}:{$ip}");
        });

        RateLimiter::for('auth-verification-resend', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();
            $email = sha1((string) $request->input('email'));

            return Limit::perMinute(config('project_auth.rate_limits.verification_resend_per_minute'))
                ->by("auth-verification-resend:{$project}:{$ip}:{$email}");
        });

        RateLimiter::for('auth-verification-confirm', function (Request $request): Limit {
            $project = $request->header('project-id', 'missing');
            $ip = $request->ip();

            return Limit::perMinute(config('project_auth.rate_limits.verification_confirm_per_minute'))
                ->by("auth-verification-confirm:{$project}:{$ip}");
        });
    }
}
