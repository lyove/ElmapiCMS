<?php

namespace App\Services;

use App\Models\Field;
use Illuminate\Support\Str;

class RichTextValue
{
    public static function editorMode(?array $fieldOptions): string
    {
        $mode = $fieldOptions['editor']['mode'] ?? 'lexical';

        return $mode === 'markdown' ? 'markdown' : 'lexical';
    }

    public static function isMarkdown(?array $fieldOptions): bool
    {
        return self::editorMode($fieldOptions) === 'markdown';
    }

    /**
     * Persist a richtext value onto a content field value model (unsaved).
     */
    public static function applyToFieldValue(mixed $fieldValue, Field $field, mixed $value): void
    {
        if (self::isMarkdown($field->options)) {
            $fieldValue->text_value = self::normalizeMarkdownInput($value);
            $fieldValue->json_value = null;

            return;
        }

        if (is_array($value) && (array_key_exists('json', $value) || array_key_exists('html', $value))) {
            $fieldValue->json_value = $value['json'] ?? null;
            $fieldValue->text_value = $value['html'] ?? null;

            return;
        }

        // API / AI string payload for Lexical fields: store as HTML snapshot.
        $fieldValue->text_value = is_string($value) ? $value : (string) $value;
    }

    /**
     * Value shape for the content form editor.
     */
    public static function forEditor(Field $field, mixed $fieldValue): mixed
    {
        if (self::isMarkdown($field->options)) {
            return (string) ($fieldValue->text_value ?? '');
        }

        if ($fieldValue->json_value) {
            return json_encode($fieldValue->json_value);
        }

        return $fieldValue->text_value;
    }

    /**
     * Value for content list / search payloads.
     */
    public static function forList(Field $field, mixed $fieldValue): mixed
    {
        if (self::isMarkdown($field->options)) {
            return (string) ($fieldValue->text_value ?? '');
        }

        return $fieldValue->json_value ?: $fieldValue->text_value;
    }

    /**
     * API resource output respecting editor mode + outputFormat.
     */
    public static function forApi(Field $field, mixed $fieldValue): mixed
    {
        $outputFormat = $field->options['editor']['outputFormat'] ?? 'html';

        if (self::isMarkdown($field->options)) {
            $markdown = (string) ($fieldValue->text_value ?? '');

            if ($outputFormat === 'markdown') {
                return $markdown;
            }

            return Str::markdown($markdown, [
                'html_input' => 'strip',
                'allow_unsafe_links' => false,
            ]);
        }

        if ($outputFormat === 'lexical') {
            return $fieldValue->json_value;
        }

        return $fieldValue->text_value;
    }

    private static function normalizeMarkdownInput(mixed $value): string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_array($value)) {
            return (string) ($value['markdown'] ?? $value['html'] ?? '');
        }

        return (string) $value;
    }
}
