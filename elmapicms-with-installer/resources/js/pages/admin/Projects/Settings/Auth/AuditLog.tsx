import { Head } from '@inertiajs/react';

import type { BreadcrumbItem, Project } from '@/admin/types';

import AppLayout from '@/admin/layouts/app-layout';
import ProjectSettingsLayout from '../layout';
import { AuditTab } from './Index';

interface Props {
    project: Project;
}

export default function AuthAuditLogPage({ project }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Authentication', href: route('projects.settings.auth.index', project.id) },
        { title: 'Audit Log', href: route('projects.settings.auth.audit.page', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auth audit log" />
            <ProjectSettingsLayout project={project}>
                <div className="max-w-6xl">
                    <AuditTab project={project} />
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}
