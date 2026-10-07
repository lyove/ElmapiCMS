import { Head } from '@inertiajs/react';

import type { BreadcrumbItem, Project } from '@/types';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from '../layout';
import { SessionsTab } from './Index';

interface Props {
    project: Project;
}

export default function AuthSessionsPage({ project }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Authentication', href: route('projects.settings.auth.index', project.id) },
        { title: 'Sessions', href: route('projects.settings.auth.sessions.page', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auth sessions" />
            <ProjectSettingsLayout project={project}>
                <div className="max-w-6xl">
                    <SessionsTab project={project} />
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}
