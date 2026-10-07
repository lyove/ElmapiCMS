<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthAuditEvent;
use App\Models\ProjectAuthSession;
use App\Models\ProjectAuthUser;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectAuthAuditEvent>
 */
class ProjectAuthAuditEventFactory extends Factory
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
            'event_type' => 'auth.login.success',
            'request_id' => fake()->uuid(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'risk_flags' => [],
            'metadata' => [],
            'occurred_at' => now(),
        ];
    }
}
