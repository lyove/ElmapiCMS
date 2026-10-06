<?php

namespace App\Http\Requests;

use App\Services\DirectAssetUploadService;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class InitiateDirectAssetUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string|Closure>>
     */
    public function rules(): array
    {
        $maxBytes = DirectAssetUploadService::maxUploadBytes();

        return [
            'original_filename' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value)) {
                        $fail(__('The original filename is invalid.'));

                        return;
                    }
                    $extension = strtolower(pathinfo($value, PATHINFO_EXTENSION));
                    if ($extension === '') {
                        $fail(__('A file extension is required.'));

                        return;
                    }
                    if (! in_array($extension, config('assets.allowed_upload_mimes', []), true)) {
                        $fail(__('This file type is not allowed.'));
                    }
                },
            ],
            'client_mime_type' => ['nullable', 'string', 'max:128'],
            'byte_size' => ['required', 'integer', 'min:1', 'max:'.$maxBytes],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'byte_size' => __('file size'),
            'original_filename' => __('filename'),
            'client_mime_type' => __('MIME type'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $maxBytes = DirectAssetUploadService::maxUploadBytes();
        $maxMb = max(1, (int) round($maxBytes / 1024 / 1024));

        return [
            'byte_size.max' => __('The file is too large. Maximum allowed size is :max MB.', [
                'max' => $maxMb,
            ]),
            'byte_size.min' => __('The file size must be at least one byte.'),
            'byte_size.integer' => __('The file size must be a whole number of bytes.'),
        ];
    }
}
