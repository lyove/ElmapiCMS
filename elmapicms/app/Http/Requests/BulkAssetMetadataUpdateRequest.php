<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkAssetMetadataUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*' => ['required', 'array'],
            'items.*.uuid' => ['required', 'string'],
            'items.*.alt_text' => ['nullable', 'string', 'max:255'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.caption' => ['nullable', 'string'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.author' => ['nullable', 'string', 'max:255'],
            'items.*.copyright' => ['nullable', 'string', 'max:255'],
        ];
    }
}
