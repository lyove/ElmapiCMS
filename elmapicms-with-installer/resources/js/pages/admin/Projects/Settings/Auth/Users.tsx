import { Head, usePage } from '@inertiajs/react';

import type { BreadcrumbItem, Project, UserCan } from '@/types';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from '../layout';
import { UsersTab } from './Index';

interface Props {
    project: Project;
}

export default function AuthUsersPage({ project }: Props) {
    const can = usePage().props.userCan as UserCan;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Authentication', href: route('projects.settings.auth.index', project.id) },
        { title: 'Users', href: route('projects.settings.auth.users.page', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auth users" />
            <ProjectSettingsLayout project={project}>
                <div className="max-w-6xl">
                    <UsersTab project={project} can={can} />
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}
