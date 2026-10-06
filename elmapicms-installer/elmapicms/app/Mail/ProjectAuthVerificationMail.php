<?php

namespace App\Mail;

use App\Models\Project;
use App\Models\ProjectAuthUser;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectAuthVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Project $project,
        public ProjectAuthUser $authUser,
        public string $verificationUrl,
        public array $contentConfig
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $fromAddress = $this->contentConfig['from_email'] ?? null;
        $fromName = $this->contentConfig['from_name'] ?? null;

        return new Envelope(
            subject: (string) ($this->contentConfig['subject'] ?? 'Verify your email address'),
            from: $fromAddress ? new Address((string) $fromAddress, $fromName ? (string) $fromName : null) : null,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.project-auth.verification',
            with: [
                'project' => $this->project,
                'authUser' => $this->authUser,
                'verificationUrl' => $this->verificationUrl,
                'heading' => (string) ($this->contentConfig['heading'] ?? 'Verify your email address'),
                'intro' => (string) ($this->contentConfig['intro'] ?? 'Please verify your email address to continue.'),
                'button_text' => (string) ($this->contentConfig['button_text'] ?? 'Verify Email'),
                'outro' => (string) ($this->contentConfig['outro'] ?? 'If you did not create this account, you can safely ignore this email.'),
            ],
        );
    }
}
