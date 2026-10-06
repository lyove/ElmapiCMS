<?php

use App\Models\ContentFieldValue;
use App\Models\Field;
use App\Models\Project;
use App\Services\RichTextValue;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeRichTextField(array $editorOptions = []): Field
{
    $project = Project::create([
        'name' => 'Test Project',
        'description' => null,
        'default_locale' => 'en',
        'locales' => ['en'],
        'disk' => 'public',
    ]);
    $collection = $project->collections()->create([
        'name' => 'Articles',
        'slug' => 'articles',
        'order' => 1,
    ]);

    return Field::create([
        'project_id' => $project->id,
        'collection_id' => $collection->id,
        'type' => 'richtext',
        'label' => 'Body',
        'name' => 'body',
        'order' => 1,
        'options' => [
            'editor' => array_merge([
                'type' => 1,
                'mode' => 'lexical',
                'outputFormat' => 'html',
            ], $editorOptions),
        ],
        'validations' => [],
    ]);
}

test('lexical mode remains the default when mode is omitted', function (): void {
    expect(RichTextValue::editorMode([]))->toBe('lexical');
    expect(RichTextValue::editorMode(['editor' => ['outputFormat' => 'html']]))->toBe('lexical');
});

test('markdown mode stores markdown string and clears json', function (): void {
    $field = makeRichTextField(['mode' => 'markdown', 'outputFormat' => 'html']);
    $fieldValue = new ContentFieldValue;

    RichTextValue::applyToFieldValue($fieldValue, $field, "# Hello\n\nWorld");

    expect($fieldValue->text_value)->toBe("# Hello\n\nWorld");
    expect($fieldValue->json_value)->toBeNull();
});

test('lexical mode stores json and html object payload', function (): void {
    $field = makeRichTextField();
    $fieldValue = new ContentFieldValue;
    $json = ['root' => ['children' => [], 'type' => 'root']];

    RichTextValue::applyToFieldValue($fieldValue, $field, [
        'json' => $json,
        'html' => '<p>Hello</p>',
    ]);

    expect($fieldValue->json_value)->toBe($json);
    expect($fieldValue->text_value)->toBe('<p>Hello</p>');
});

test('api output renders markdown to html by default', function (): void {
    $field = makeRichTextField(['mode' => 'markdown', 'outputFormat' => 'html']);
    $fieldValue = new ContentFieldValue([
        'text_value' => '**bold**',
    ]);

    $html = RichTextValue::forApi($field, $fieldValue);

    expect($html)->toContain('<strong>bold</strong>');
});

test('api output can return raw markdown', function (): void {
    $field = makeRichTextField(['mode' => 'markdown', 'outputFormat' => 'markdown']);
    $fieldValue = new ContentFieldValue([
        'text_value' => '**bold**',
    ]);

    expect(RichTextValue::forApi($field, $fieldValue))->toBe('**bold**');
});

test('api output returns lexical json when configured', function (): void {
    $field = makeRichTextField(['mode' => 'lexical', 'outputFormat' => 'lexical']);
    $json = ['root' => ['children' => [], 'type' => 'root']];
    $fieldValue = new ContentFieldValue([
        'json_value' => $json,
        'text_value' => '<p>x</p>',
    ]);

    expect(RichTextValue::forApi($field, $fieldValue))->toBe($json);
});
