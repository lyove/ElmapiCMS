<?php

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create([
        'public_api' => true,
    ]);
});

test('api rate limit respects configured requests per minute', function () {
    config(['app.api_rate_limit_per_minute' => 2]);

    $headers = [
        'project-id' => $this->project->uuid,
        'Accept' => 'application/json',
    ];

    $this->withHeaders($headers)->getJson('/api/')->assertOk();
    $this->withHeaders($headers)->getJson('/api/')->assertOk();
    $this->withHeaders($headers)->getJson('/api/')->assertTooManyRequests();
});
