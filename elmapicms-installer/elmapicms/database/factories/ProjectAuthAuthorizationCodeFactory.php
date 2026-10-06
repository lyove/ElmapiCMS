<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthAuthorizationCode;
use App\Models\ProjectAuthClient;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectAuthAuthorizationCode>
 */
class ProjectAuthAuthorizationCodeFactory extends Factory
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
            'project_auth_client_id' => ProjectAuthClient::factory(),
            'code_hash' => hash('sha256', Str::random(72)),
            'redirect_uri' => fake()->url().'/auth/callback',
            'code_challenge' => rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='),
            'code_challenge_method' => 'S256',
            'scopes' => ['openid', 'profile'],
            'expires_at' => now()->addMinutes(10),
            'consumed_at' => null,
        ];
    }
}
