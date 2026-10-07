<?php

return [
    'issuer' => env('PROJECT_AUTH_ISSUER', rtrim((string) env('APP_URL', 'http://localhost'), '/')),
    'access_token_ttl_minutes' => (int) env('PROJECT_AUTH_ACCESS_TOKEN_TTL_MINUTES', 15),
    'refresh_token_ttl_days' => (int) env('PROJECT_AUTH_REFRESH_TOKEN_TTL_DAYS', 30),
    'jwt_key_ttl_days' => (int) env('PROJECT_AUTH_JWT_KEY_TTL_DAYS', 180),
    'audit_retention_days' => (int) env('PROJECT_AUTH_AUDIT_RETENTION_DAYS', 90),
    'max_sessions_per_user' => (int) env('PROJECT_AUTH_MAX_SESSIONS_PER_USER', 25),
    'verification_token_ttl_minutes' => (int) env('PROJECT_AUTH_VERIFICATION_TOKEN_TTL_MINUTES', 60),
    'verification_resend_cooldown_seconds' => (int) env('PROJECT_AUTH_VERIFICATION_RESEND_COOLDOWN_SECONDS', 60),
    'verification_email' => [
        'subject' => env('PROJECT_AUTH_VERIFICATION_EMAIL_SUBJECT', 'Verify your email address'),
        'heading' => env('PROJECT_AUTH_VERIFICATION_EMAIL_HEADING', 'Verify your email address'),
        'intro' => env('PROJECT_AUTH_VERIFICATION_EMAIL_INTRO', 'Please verify your email address to continue.'),
        'button_text' => env('PROJECT_AUTH_VERIFICATION_EMAIL_BUTTON_TEXT', 'Verify Email'),
        'outro' => env('PROJECT_AUTH_VERIFICATION_EMAIL_OUTRO', 'If you did not create this account, you can safely ignore this email.'),
        'from_name' => env('PROJECT_AUTH_VERIFICATION_EMAIL_FROM_NAME', env('MAIL_FROM_NAME')),
        'from_email' => env('PROJECT_AUTH_VERIFICATION_EMAIL_FROM_EMAIL', env('MAIL_FROM_ADDRESS')),
        'verification_url_base' => env('PROJECT_AUTH_VERIFICATION_URL_BASE', rtrim((string) env('APP_URL', 'http://localhost'), '/')),
    ],
    'rate_limits' => [
        'signup_per_minute' => (int) env('PROJECT_AUTH_SIGNUP_PER_MINUTE', 10),
        'signin_per_minute' => (int) env('PROJECT_AUTH_SIGNIN_PER_MINUTE', 20),
        'refresh_per_minute' => (int) env('PROJECT_AUTH_REFRESH_PER_MINUTE', 120),
        'api_keys_per_minute' => (int) env('PROJECT_AUTH_API_KEYS_PER_MINUTE', 30),
        'api_key_introspect_per_minute' => (int) env('PROJECT_AUTH_API_KEY_INTROSPECT_PER_MINUTE', 240),
        'verification_resend_per_minute' => (int) env('PROJECT_AUTH_VERIFICATION_RESEND_PER_MINUTE', 20),
        'verification_confirm_per_minute' => (int) env('PROJECT_AUTH_VERIFICATION_CONFIRM_PER_MINUTE', 60),
    ],
    'max_failed_signins_before_lockout' => (int) env('PROJECT_AUTH_MAX_FAILED_SIGNINS_BEFORE_LOCKOUT', 5),
    'signin_lockout_seconds' => (int) env('PROJECT_AUTH_SIGNIN_LOCKOUT_SECONDS', 300),
];
