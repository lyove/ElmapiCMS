<?php

declare(strict_types=1);

namespace ElmapiCMS\Installer\Controllers;

use ElmapiCMS\Installer\Services\RequirementsChecker;
use Illuminate\View\View;

final class RequirementsController
{
    public function __construct(private readonly RequirementsChecker $checker) {}

    public function index(): View
    {
        $checks = $this->checker->check(base_path());

        return view('installer::requirements', [
            'checks' => $checks,
            'passed' => $this->checker->allPassed($checks),
            'basePath' => base_path(),
        ]);
    }
}
