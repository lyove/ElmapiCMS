<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectAuthJwtKey;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ProjectAuthJwtKey>
 */
class ProjectAuthJwtKeyFactory extends Factory
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
            'kid' => 'kid_'.Str::lower(Str::random(20)),
            'algorithm' => 'HS256',
            'public_key' => null,
            'private_key' => null,
            'secret' => Str::random(64),
            'not_before' => now(),
            'not_after' => now()->addMonths(6),
            'is_active' => true,
        ];
    }
}
