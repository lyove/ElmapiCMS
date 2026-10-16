<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->name,
            'description' => $this->faker->sentence,
            'preview_url' => null,
            'default_locale' => 'en',
            'locales' => ['en'],
            'disk' => 'public',
            'public_api' => false,
            'project_auth_require_verified_email' => false,
            'project_auth_email_verification_config' => null,
            'created_at' => now(),
        ];
    }
}
