<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property int|null $published_version_id
 * @property int|null $published_version_number
 * @property bool $is_draft_dirty
 */
class ContentEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'collection_id',
        'locale',
        'state',
        'created_by',
        'updated_by',
        'published_at',
        'translation_group_id',
        'published_version_id',
        'published_version_number',
        'is_draft_dirty',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'id' => 'integer',
        'project_id' => 'integer',
        'collection_id' => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
        'published_version_id' => 'integer',
        'published_version_number' => 'integer',
        'is_draft_dirty' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($contentEntry) {
            $contentEntry->uuid = (string) Str::uuid();
        });
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

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function fieldValues(): HasMany
    {
        return $this->hasMany(ContentFieldValue::class);
    }

    public function fieldGroups(): HasMany
    {
        return $this->hasMany(ContentFieldGroup::class)->orderBy('sort_order');
    }

    public function publishedVersion(): BelongsTo
    {
        return $this->belongsTo(ContentEntryVersion::class, 'published_version_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ContentEntryVersion::class)->orderByDesc('version_number');
    }

    public function hasPublishedVersion(): bool
    {
        return $this->published_version_id !== null;
    }

    public function latestVersionNumber(): int
    {
        return (int) $this->versions()->max('version_number');
    }

    public function markDraftDirty(bool $dirty = true): void
    {
        if ($this->is_draft_dirty === $dirty) {
            return;
        }

        $this->is_draft_dirty = $dirty;
        $this->save();
    }

    /**
     * Get all translations of this entry (entries in the same translation group)
     */
    public function translations()
    {
        if (! $this->translation_group_id) {
            return collect([]);
        }

        return static::where('translation_group_id', $this->translation_group_id)
            ->where('id', '!=', $this->id)
            ->get();
    }

    /**
     * Get all entries in the same translation group (including this entry)
     */
    public function translationGroup()
    {
        if (! $this->translation_group_id) {
            return collect([$this]);
        }

        return static::where('translation_group_id', $this->translation_group_id)->get();
    }
}
