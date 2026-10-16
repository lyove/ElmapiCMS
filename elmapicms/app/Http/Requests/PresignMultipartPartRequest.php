<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PresignMultipartPartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'intent_uuid' => ['required', 'uuid'],
            'part_number' => ['required', 'integer', 'min:1'],
            'content_length' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
