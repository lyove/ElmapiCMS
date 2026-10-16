<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\ConversationStore;

uses(RefreshDatabase::class);

test('database conversation store persists conversations with participant morph columns', function () {
    $user = User::factory()->create();
    $store = app(ConversationStore::class);

    $conversationId = $store->storeConversation(User::class, $user->id, 'Persistence check');

    $row = DB::table('agent_conversations')->where('id', $conversationId)->first();

    expect($row)->not->toBeNull()
        ->and($row->participant_type)->toBe(User::class)
        ->and((int) $row->participant_id)->toBe($user->id)
        ->and($row->title)->toBe('Persistence check');

    $response = $this
        ->actingAs($user)
        ->getJson(route('ai.conversations'));

    $response->assertOk()
        ->assertJsonPath('0.id', $conversationId)
        ->assertJsonPath('0.title', 'Persistence check');
});
