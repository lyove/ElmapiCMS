<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthIdentity;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectAuthIdentity>
 */
class ProjectAuthIdentityFactory extends Factory
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
            'project_auth_user_id' => ProjectAuthUser::factory(),
            'provider' => 'github',
            'provider_subject' => (string) fake()->numberBetween(10000, 99999),
            'provider_email' => fake()->safeEmail(),
            'provider_data' => [
                'name' => fake()->name(),
            ],
        ];
    }
}
