<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthRefreshToken;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectAuthRefreshToken>
 */
class ProjectAuthRefreshTokenFactory extends Factory
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
            'project_auth_session_id' => ProjectAuthSession::factory(),
            'family_uuid' => (string) Str::uuid(),
            'token_hash' => hash('sha256', Str::uuid().Str::random(40)),
            'replaced_by_token_id' => null,
            'last_used_at' => null,
            'expires_at' => now()->addDays(30),
            'revoked_at' => null,
            'reused_at' => null,
            'issued_ip' => fake()->ipv4(),
            'issued_user_agent' => fake()->userAgent(),
        ];
    }
}
