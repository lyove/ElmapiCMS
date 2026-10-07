<?php

namespace App\Exceptions;

use App\Models\ProjectAuthUser;
use Exception;

class ProjectAuthEmailVerificationRequiredException extends Exception
{
    public function __construct(public ProjectAuthUser $authUser, string $message = 'Email verification is required.')
    {
        parent::__construct($message);
    }
}
