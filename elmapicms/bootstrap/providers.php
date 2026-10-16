<?php

use App\Providers\AppServiceProvider;
use App\Providers\EventServiceProvider;
use ElmapiCMS\Installer\InstallerServiceProvider;

return [
    AppServiceProvider::class,
    EventServiceProvider::class,
    InstallerServiceProvider::class,
];
