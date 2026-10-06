<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = [
        'app_name',
        'font_family',
        'theme_radius',
        'theme_tokens',
        'theme_preset_key',
        'theme_custom_tokens',
        'logo_file',
        'favicon_file',
        'ai_enabled',
        'ai_provider',
        'ai_model',
        'ai_show_token_usage',
        'ai_max_conversation_messages',
        'ai_max_tokens',
        'ai_max_steps',
    ];

    protected function casts(): array
    {
        return [
            'theme_tokens' => 'array',
            'theme_custom_tokens' => 'array',
            'ai_enabled' => 'boolean',
            'ai_show_token_usage' => 'boolean',
            'ai_max_conversation_messages' => 'integer',
            'ai_max_tokens' => 'integer',
            'ai_max_steps' => 'integer',
        ];
    }
}
