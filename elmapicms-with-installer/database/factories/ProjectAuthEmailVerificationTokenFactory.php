<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthEmailVerificationToken;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectAuthEmailVerificationToken>
 */
class ProjectAuthEmailVerificationTokenFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $rawToken = fake()->sha256();

        return [
            'project_id' => Project::factory(),
            'project_auth_user_id' => ProjectAuthUser::factory()->state(function (array $attributes): array {
                return [
                    'project_id' => $attributes['project_id'],
                ];
            }),
            'token_hash' => hash('sha256', $rawToken),
            'email' => fake()->safeEmail(),
            'expires_at' => now()->addMinutes(30),
            'consumed_at' => null,
        ];
    }
}
