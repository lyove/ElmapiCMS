<?php

namespace App\Events;

use App\Models\Project;
use App\Models\ProjectAuthUser;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ProjectAuthEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $name,
        public Project $project,
        public ?ProjectAuthUser $authUser
    ) {}
}
