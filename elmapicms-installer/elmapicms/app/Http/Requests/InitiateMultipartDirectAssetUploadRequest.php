<?php

namespace App\Http\Requests;

class InitiateMultipartDirectAssetUploadRequest extends InitiateDirectAssetUploadRequest
{
    /**
     * @return array<string, array<int, string|\Closure>>
     */
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'part_size_bytes' => ['sometimes', 'nullable', 'integer', 'min:5242880'],
        ]);
    }
}
