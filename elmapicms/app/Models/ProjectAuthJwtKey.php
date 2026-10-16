<?php

namespace App\Models;

use Database\Factories\ProjectAuthJwtKeyFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAuthJwtKey extends Model
{
    /** @use HasFactory<ProjectAuthJwtKeyFactory> */
    use HasFactory;

    protected $fillable = [
        'project_id',
        'kid',
        'algorithm',
        'public_key',
        'private_key',
        'secret',
        'not_before',
        'not_after',
        'is_active',
    ];

    protected $hidden = [
        'private_key',
        'secret',
    ];

    protected function casts(): array
    {
        return [
            'not_before' => 'datetime',
            'not_after' => 'datetime',
            'is_active' => 'boolean',
            'id' => 'integer',
            'project_id' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
