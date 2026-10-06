<?php

namespace App\Http\Requests;

use App\Rules\SafeWebhookUrl;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WebhookRequest extends FormRequest
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
        $project = $this->attributes->get('project');

        $allowedEvents = [
            'content.created',
            'content.updated',
            'content.published',
            'content.unpublished',
            'content.deleted',
            'content.trashed',
            'content.restored',
            'auth.signup.success',
            'auth.login.success',
            'auth.logout.success',
            'auth.logout_all.success',
            'auth.email_verification.verified',
        ];

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'url' => ['required', 'string', 'max:2048', 'url', new SafeWebhookUrl],
            'secret' => ['nullable', 'string', 'min:6', 'max:255'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['required', 'string', Rule::in($allowedEvents)],
            'sources' => ['required', 'array', 'min:1'],
            'sources.*' => ['required', 'string', Rule::in(['cms', 'api'])],
            'payload' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'boolean'],
            'collection_ids' => ['nullable', 'array'],
            'collection_ids.*' => [
                'required',
                'integer',
                Rule::exists('collections', 'id')->where(function ($query) use ($project) {
                    return $query->where('project_id', $project?->id);
                }),
            ],
        ];
    }
}
