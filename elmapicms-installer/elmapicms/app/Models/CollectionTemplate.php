<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CollectionTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'uuid',
        'is_singleton',
    ];

    protected $casts = [
        'is_singleton' => 'boolean',
        'id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($template) {
            $template->uuid = (string) Str::uuid();
        });
    }

    public function fields(): HasMany
    {
        return $this->hasMany(CollectionTemplateField::class)->orderBy('order');
    }
}
