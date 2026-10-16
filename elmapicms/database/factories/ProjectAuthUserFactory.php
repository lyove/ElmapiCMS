<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<ProjectAuthUser>
 */
class ProjectAuthUserFactory extends Factory
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
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'display_name' => fake()->name(),
            'metadata' => null,
            'last_login_at' => null,
            'suspended_at' => null,
        ];
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes): array => [
            'suspended_at' => now(),
        ]);
    }

    public function unverified(): static
    {
        return $this->state(fn (array $attributes): array => [
            'email_verified_at' => null,
        ]);
    }
}
