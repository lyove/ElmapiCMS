import { Head, usePage } from '@inertiajs/react';

import type { BreadcrumbItem, Project, UserCan } from '@/admin/types';

import AppLayout from '@/admin/layouts/app-layout';
import ProjectSettingsLayout from '../layout';
import { ApiKeysTab } from './Index';

interface Props {
    project: Project;
}

export default function AuthApiKeysPage({ project }: Props) {
    const can = usePage().props.userCan as UserCan;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Authentication', href: route('projects.settings.auth.index', project.id) },
        { title: 'API Keys', href: route('projects.settings.auth.api-keys.page', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auth api keys" />
            <ProjectSettingsLayout project={project}>
                <div className="max-w-6xl">
                    <ApiKeysTab project={project} can={can} />
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}
