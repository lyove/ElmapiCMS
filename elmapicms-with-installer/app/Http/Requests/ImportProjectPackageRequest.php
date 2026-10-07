<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class ImportProjectPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'not_regex:/[#$%^&*()+=\-\[\]\';,\/{}|":<>?~\\\\]/'],
            'default_locale' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'import_file' => [
                'required',
                File::types(['json', 'zip'])->max(config('assets.portable_packages.max_upload_size', '1gb')),
            ],
        ];
    }
}
