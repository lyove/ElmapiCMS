<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Allow insecure (HTTP) webhook URLs
    |--------------------------------------------------------------------------
    |
    | When false, only https:// URLs are accepted. Enable locally if you must
    | target http:// endpoints during development.
    |
    */
    'allow_insecure_http' => (bool) env('WEBHOOK_ALLOW_INSECURE_HTTP', false),

    /*
    |--------------------------------------------------------------------------
    | Log storage limits
    |--------------------------------------------------------------------------
    |
    | Response bodies and request payloads stored in webhook_logs are capped
    | to limit database growth and accidental storage of huge HTML/JSON.
    |
    */
    'log_response_body_max_bytes' => (int) env('WEBHOOK_LOG_RESPONSE_BODY_MAX_BYTES', 8192),

    'log_request_json_max_bytes' => (int) env('WEBHOOK_LOG_REQUEST_JSON_MAX_BYTES', 65536),

    /*
    |--------------------------------------------------------------------------
    | Webhook delivery logs API
    |--------------------------------------------------------------------------
    */
    'logs_max_per_page' => (int) env('WEBHOOK_LOGS_MAX_PER_PAGE', 100),

];
