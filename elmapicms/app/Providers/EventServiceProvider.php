<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * Explicit listen map left empty: Laravel's framework EventServiceProvider
     * already auto-discovers app/Listeners (handle method type-hints). Keeping
     * ContentEvent / ProjectAuthEvent here would register them twice.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }
}
