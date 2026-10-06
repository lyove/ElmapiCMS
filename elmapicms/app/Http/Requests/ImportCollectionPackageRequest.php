<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class ImportCollectionPackageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $project = $this->route('project');

        return [
            'import_file' => [
                'required',
                File::types(['json', 'zip'])->max(config('assets.portable_packages.max_upload_size', '1gb')),
            ],
            'name' => ['nullable', 'string', 'max:60'],
            'slug' => [
                'nullable',
                'string',
                'max:60',
                Rule::notIn(['collections', 'files']),
                Rule::unique('collections', 'slug')->where('project_id', $project?->id),
            ],
            'is_singleton' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
