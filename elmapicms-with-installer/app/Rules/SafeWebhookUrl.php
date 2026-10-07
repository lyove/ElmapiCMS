<?php

namespace App\Rules;

use App\Services\Webhooks\WebhookUrlSafety;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use InvalidArgumentException;

class SafeWebhookUrl implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            return;
        }

        try {
            WebhookUrlSafety::assertSafe($value);
        } catch (InvalidArgumentException $e) {
            $fail($e->getMessage());
        }
    }
}
