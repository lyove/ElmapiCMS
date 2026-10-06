<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkContentStoreRequest extends FormRequest
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
            'items.*.locale' => ['nullable', 'string', 'max:10'],
            'items.*.state' => ['nullable', 'in:draft,published'],
            'items.*.data' => ['required', 'array'],
        ];
    }
}
