import { Head, usePage } from '@inertiajs/react';

import { Collection, Project, BreadcrumbItem, SharedData, Field, ContentEntry } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';

import ProjectSidebar from '@/pages/admin/Projects/ProjectSidebar';
import ContentList from '@/pages/admin/Content/ContentList';
import ContentForm from '@/pages/admin/Content/ContentForm';
import ProjectsLayout from '../Projects/layout';

interface Props {
    project: Project;
    collection: Collection & {
        fields: Field[];
    };
    contentEntry?: ContentEntry;
    formData?: Record<string, unknown>;
    isEditMode?: boolean;
}

export default function Show({ project, collection, contentEntry, formData, isEditMode }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', { project: project.id }),
        },
        {
            title: collection.name,
            href: route('projects.collections.show', { project: project.id, collection: collection.id }),
        },
    ];

    const page = usePage<SharedData>();
    const isContentCreatePage = page.url.includes('content/create');
    const isContentEditPage = page.url.includes('content') && page.url.includes('edit');
    const showContentForm = isContentCreatePage || isContentEditPage || isEditMode;

    // Add appropriate breadcrumb
    if (isContentCreatePage) {
        breadcrumbs.push({
            title: 'Create Content',
            href: route('projects.collections.content.create', { project: project.id, collection: collection.id }),
        });
    } else if (isContentEditPage || isEditMode) {
        breadcrumbs.push({
            title: 'Edit Content',
            href: contentEntry ? route('projects.collections.content.edit', { 
                project: project.id, 
                collection: collection.id,
                contentEntry: contentEntry.id 
            }) : '#',
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={contentEntry && (isContentEditPage || isEditMode) ? `Edit ${collection.name}` : collection.name} />

            <ProjectsLayout>
                <ProjectSidebar project={project} />

                <div className="flex-1 min-w-0 @container">
                    {!showContentForm && <ContentList collection={collection} project={project} />}
                    {showContentForm && (
                        <ContentForm 
                            collection={collection} 
                            project={project} 
                            contentEntry={contentEntry}
                            formData={formData}
                            isEditMode={isEditMode}
                        />
                    )}
                </div>
            </ProjectsLayout>
        </AppLayout>
    );
} 