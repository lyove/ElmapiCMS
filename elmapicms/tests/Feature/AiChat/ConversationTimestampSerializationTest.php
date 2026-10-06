<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('ai conversations endpoint serializes timestamps with timezone offsets', function () {
    $user = User::factory()->create();

    DB::table('agent_conversations')->insert([
        'id' => '11111111-1111-4111-8111-111111111111',
        'participant_type' => User::class,
        'participant_id' => $user->id,
        'title' => 'Timezone serialization check',
        'created_at' => '2026-03-13 10:00:00',
        'updated_at' => '2026-03-13 10:00:05',
    ]);

    $response = $this
        ->actingAs($user)
        ->getJson(route('ai.conversations'));

    $response->assertOk()
        ->assertJsonCount(1);

    $createdAt = $response->json('0.created_at');
    $updatedAt = $response->json('0.updated_at');

    expect($createdAt)->toBeString()
        ->and($updatedAt)->toBeString()
        ->and($createdAt)->toMatch('/T/')
        ->and($updatedAt)->toMatch('/T/')
        ->and($createdAt)->toMatch('/(Z|[+-]\d{2}:\d{2})$/')
        ->and($updatedAt)->toMatch('/(Z|[+-]\d{2}:\d{2})$/')
        ->and($createdAt)->not->toContain(' ')
        ->and($updatedAt)->not->toContain(' ');
});

test('ai conversations endpoint only returns authenticated user conversations', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    DB::table('agent_conversations')->insert([
        [
            'id' => '22222222-2222-4222-8222-222222222222',
            'participant_type' => User::class,
            'participant_id' => $user->id,
            'title' => 'User conversation',
            'created_at' => '2026-03-13 11:00:00',
            'updated_at' => '2026-03-13 11:01:00',
        ],
        [
            'id' => '33333333-3333-4333-8333-333333333333',
            'participant_type' => User::class,
            'participant_id' => $otherUser->id,
            'title' => 'Other user conversation',
            'created_at' => '2026-03-13 12:00:00',
            'updated_at' => '2026-03-13 12:01:00',
        ],
    ]);

    $response = $this
        ->actingAs($user)
        ->getJson(route('ai.conversations'));

    $response->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.id', '22222222-2222-4222-8222-222222222222');
});
