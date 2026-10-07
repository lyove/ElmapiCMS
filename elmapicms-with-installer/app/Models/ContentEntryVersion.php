<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Immutable snapshot of a content entry at the moment it was published.
 *
 * @property array{fields: array<string, mixed>, meta: array<string, mixed>} $snapshot
 */
class ContentEntryVersion extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'content_entry_id',
        'project_id',
        'collection_id',
        'locale',
        'translation_group_id',
        'version_number',
        'label',
        'description',
        'snapshot',
        'published_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'published_at' => 'datetime',
            'version_number' => 'integer',
            'content_entry_id' => 'integer',
            'project_id' => 'integer',
            'collection_id' => 'integer',
            'created_by' => 'integer',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $version): void {
            if (! $version->uuid) {
                $version->uuid = (string) Str::uuid();
            }
        });
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(ContentEntry::class, 'content_entry_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
