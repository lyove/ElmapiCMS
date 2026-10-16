<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExportProjectPackageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'include_collections' => ['sometimes', 'boolean'],
            'include_content' => ['sometimes', 'boolean'],
            'asset_scope' => ['sometimes', 'string', Rule::in(['none', 'referenced', 'all'])],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->input('asset_scope', 'none') !== 'referenced') {
                    return;
                }

                if (! $this->boolean('include_content') || ! $this->boolean('include_collections', true)) {
                    $validator->errors()->add(
                        'asset_scope',
                        'Referenced assets can only be exported when published content and collections are included.'
                    );
                }
            },
        ];
    }
}
