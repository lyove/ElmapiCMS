import { Head } from '@inertiajs/react';

import type { BreadcrumbItem, Project } from '@/admin/types';

import AppLayout from '@/admin/layouts/app-layout';
import ProjectSettingsLayout from '../layout';
import { VerificationSettingsCard } from './Index';

interface Props {
    project: Project;
    authSettings: {
        require_verified_email: boolean;
        verification_email: {
            subject: string;
            heading: string;
            intro: string;
            button_text: string;
            outro: string;
            from_name: string;
            from_email: string;
            verification_url_base: string;
        };
    };
}

export default function AuthEmailVerificationPage({ project, authSettings }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Authentication', href: route('projects.settings.auth.index', project.id) },
        { title: 'Email Verification', href: route('projects.settings.auth.email-verification.page', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auth email verification" />
            <ProjectSettingsLayout project={project}>
                <div className="max-w-6xl">
                    <VerificationSettingsCard project={project} authSettings={authSettings} />
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}
