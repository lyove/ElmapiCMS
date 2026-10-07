import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import type { Project, BreadcrumbItem, UserCan } from '@/admin/types/index.d';

import AppLayout from '@/admin/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import HeadingSmall from '@/admin/components/heading-small';
import InputError from '@/admin/components/input-error';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import DeleteProject from '@/admin/components/delete-project';
import { Separator } from '@/admin/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/admin/components/ui/radio-group';

interface Props {
    project: Project;
}

export default function ProjectSettingsPage({ project }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', project.id),
        },
        {
            title: 'Settings',
            href: route('projects.settings.project', project.id),
        },
    ];

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        name: project.name || '',
        description: project.description || '',
        preview_url: project.preview_url || '',
        default_locale: project.default_locale || '',
        disk: project.disk || 'public',
    });

    const can = usePage().props.userCan as UserCan;
    
    const awsCredentialsConfigured = usePage().props.awsCredentialsConfigured as boolean;

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('projects.update', project.id), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Project settings" />

            <ProjectSettingsLayout project={project}>
                <div className="space-y-6 max-w-2xl">
                    <HeadingSmall title="Project" description="Update the basic information of the project" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Project Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                placeholder="Project name"
                            />
                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Short description (optional)"
                            />
                            <InputError className="mt-2" message={errors.description} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="preview_url">Preview URL</Label>
                            <Input
                                id="preview_url"
                                type="url"
                                value={data.preview_url}
                                onChange={(e) => setData('preview_url', e.target.value)}
                                placeholder="https://preview.example.com"
                            />
                            {data.preview_url && !errors.preview_url && (
                                <a
                                    href={data.preview_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
                                >
                                    Open preview
                                </a>
                            )}
                            <InputError className="mt-2" message={errors.preview_url} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="disk">Default Storage</Label>
                            <RadioGroup
                                id="disk"
                                value={data.disk}
                                onValueChange={(value) => setData('disk', value as 'public' | 's3')}
                                className="flex gap-4"
                            >
                                <div className="flex flex-col p-4 px-6 border border-dashed rounded-md">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="public" id="disk-public" />
                                        <Label htmlFor="disk-public" className="font-medium">Local Storage</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">Files stored on this server.</p>
                                </div>
                                {awsCredentialsConfigured && (
                                <div className="flex items-center space-x-1 p-4 px-10 pl-4 border border-dashed rounded-md">
                                    <RadioGroupItem value="s3" id="disk-s3" />
                                    <Label htmlFor="disk-s3">AWS&nbsp;S3</Label>
                                    </div>
                                )}
                            </RadioGroup>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>
                            {recentlySuccessful && (
                                <p className="text-sm text-neutral-600">Saved</p>
                            )}
                        </div>
                    </form>

                    {can.delete_project && (
                        <>
                            <Separator />
                            <DeleteProject projectId={project.id} projectName={project.name} />
                        </>
                    )}
                </div>
                
                
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 