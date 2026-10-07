<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

class ContentTextAgent implements Agent
{
    use Promptable;

    public function __construct(
        public string $systemPrompt,
        public int $maxTokens = 4096,
    ) {}

    public function instructions(): Stringable|string
    {
        return $this->systemPrompt;
    }

    public function maxTokens(): int
    {
        return $this->maxTokens;
    }
}
