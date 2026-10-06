<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkContentDestroyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'uuids' => ['required', 'array', 'min:1', 'max:100'],
            'uuids.*' => ['required', 'string'],
            'force' => ['sometimes', 'boolean'],
        ];
    }
}
