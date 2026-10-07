<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('ai conversation messages include ordered assistant parts from tools', function () {
    $user = User::factory()->create();
    $conversationId = '44444444-4444-4444-8444-444444444444';

    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'participant_type' => User::class,
        'participant_id' => $user->id,
        'title' => 'Parts restore check',
        'created_at' => '2026-03-13 10:00:00',
        'updated_at' => '2026-03-13 10:00:05',
    ]);

    DB::table('agent_conversation_messages')->insert([
        [
            'id' => '55555555-5555-4555-8555-555555555555',
            'conversation_id' => $conversationId,
            'participant_type' => User::class,
            'participant_id' => $user->id,
            'agent' => 'ElmapiAssistant',
            'role' => 'user',
            'content' => 'Create a project',
            'attachments' => '[]',
            'tool_calls' => '[]',
            'tool_results' => '[]',
            'usage' => '[]',
            'meta' => '[]',
            'created_at' => '2026-03-13 10:00:01',
            'updated_at' => '2026-03-13 10:00:01',
        ],
        [
            'id' => '66666666-6666-4666-8666-666666666666',
            'conversation_id' => $conversationId,
            'participant_type' => User::class,
            'participant_id' => $user->id,
            'agent' => 'ElmapiAssistant',
            'role' => 'assistant',
            'content' => 'Done creating the project.',
            'attachments' => '[]',
            'tool_calls' => json_encode([
                [
                    'id' => 'call_1',
                    'name' => 'CreateProject',
                    'arguments' => ['name' => 'Demo'],
                ],
            ]),
            'tool_results' => json_encode([
                [
                    'id' => 'result_1',
                    'result_id' => 'call_1',
                    'name' => 'CreateProject',
                    'result' => json_encode(['id' => 12, 'name' => 'Demo']),
                ],
            ]),
            'usage' => json_encode(['prompt_tokens' => 10, 'completion_tokens' => 5]),
            'meta' => '[]',
            'created_at' => '2026-03-13 10:00:02',
            'updated_at' => '2026-03-13 10:00:02',
        ],
    ]);

    $response = $this
        ->actingAs($user)
        ->getJson(route('ai.conversations.messages', $conversationId));

    $response->assertOk()
        ->assertJsonPath('messages.0.role', 'user')
        ->assertJsonPath('messages.1.role', 'assistant')
        ->assertJsonPath('messages.1.parts.0.type', 'text')
        ->assertJsonPath('messages.1.parts.0.content', 'Done creating the project.')
        ->assertJsonPath('messages.1.parts.1.type', 'tool')
        ->assertJsonPath('messages.1.parts.1.step.toolName', 'CreateProject')
        ->assertJsonPath('messages.1.parts.1.step.status', 'done');

    expect($response->json('messages.0'))->not->toHaveKey('parts');
});

test('ai conversation messages mark tool parts as error when result has error', function () {
    $user = User::factory()->create();
    $conversationId = '77777777-7777-4777-8777-777777777777';

    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'participant_type' => User::class,
        'participant_id' => $user->id,
        'title' => 'Tool error parts',
        'created_at' => '2026-03-13 11:00:00',
        'updated_at' => '2026-03-13 11:00:05',
    ]);

    DB::table('agent_conversation_messages')->insert([
        'id' => '88888888-8888-4888-8888-888888888888',
        'conversation_id' => $conversationId,
        'participant_type' => User::class,
        'participant_id' => $user->id,
        'agent' => 'ElmapiAssistant',
        'role' => 'assistant',
        'content' => '',
        'attachments' => '[]',
        'tool_calls' => json_encode([
            [
                'id' => 'call_err',
                'name' => 'ManageSchema',
                'arguments' => [],
            ],
        ]),
        'tool_results' => json_encode([
            [
                'id' => 'result_err',
                'result_id' => 'call_err',
                'name' => 'ManageSchema',
                'result' => json_encode(['error' => 'Collection not found']),
            ],
        ]),
        'usage' => json_encode(['prompt_tokens' => 3, 'completion_tokens' => 1]),
        'meta' => '[]',
        'created_at' => '2026-03-13 11:00:02',
        'updated_at' => '2026-03-13 11:00:02',
    ]);

    $response = $this
        ->actingAs($user)
        ->getJson(route('ai.conversations.messages', $conversationId));

    $response->assertOk()
        ->assertJsonPath('messages.0.parts.0.type', 'tool')
        ->assertJsonPath('messages.0.parts.0.step.toolName', 'ManageSchema')
        ->assertJsonPath('messages.0.parts.0.step.status', 'error');
});
