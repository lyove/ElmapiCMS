<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthClient;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectAuthClient>
 */
class ProjectAuthClientFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => fake()->company().' Public Client',
            'client_id' => 'client_'.Str::lower(Str::random(24)),
            'client_secret_hash' => null,
            'redirect_uris' => [
                fake()->url().'/auth/callback',
            ],
            'allowed_scopes' => ['openid', 'profile', 'email', 'read'],
            'is_confidential' => false,
            'is_active' => true,
        ];
    }
}
