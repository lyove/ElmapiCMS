<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectAuthSession>
 */
class ProjectAuthSessionFactory extends Factory
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
            'session_uuid' => (string) Str::uuid(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'last_activity_at' => now(),
            'expires_at' => now()->addDays(30),
            'revoked_at' => null,
        ];
    }
}
