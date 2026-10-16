<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthApiKey;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectAuthApiKey>
 */
class ProjectAuthApiKeyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $secret = Str::random(64);

        return [
            'project_id' => Project::factory(),
            'project_auth_user_id' => ProjectAuthUser::factory()->state(function (array $attributes): array {
                return [
                    'project_id' => $attributes['project_id'],
                ];
            }),
            'name' => fake()->words(2, true),
            'key_prefix' => 'uak_'.Str::lower(Str::random(12)),
            'key_hash' => hash('sha256', $secret),
            'scopes' => ['read'],
            'expires_at' => null,
            'last_used_at' => null,
            'revoked_at' => null,
        ];
    }
}
