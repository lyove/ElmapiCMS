import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

import type { Collection, Project, Field, BreadcrumbItem, UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Copy, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatLocalDate } from '@/lib/date';

import ProjectSidebar from '../Projects/ProjectSidebar';
import FieldList from './Fields/FieldList';
import AddFieldModal from './Fields/AddFieldModal';
import ProjectsLayout from '../Projects/layout';

interface Props {
    project: Project & {
        collections: Collection[];
    };
    collection: Collection & {
        fields: Field[];
    }
}

export default function Edit({ project, collection }: Props) {
    const can = usePage().props.userCan as UserCan;
    
    const [copied, setCopied] = useState(false);
    const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState(collection.name);

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveTemplate = async () => {
        try {
            await axios.post(route('collections.saveAsTemplate', [project.id, collection.id]), { name: templateName });
            setTemplateModalOpen(false);
            toast.success('Template saved');
        } catch (e) {
            console.error(e);
            toast.error('Failed to save template');
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', project.id),
        },
        {
            title: collection.name,
            href: route('projects.collections.show', [project.id, collection.id]),
        },
        {
            title: 'Edit Collection',
            href: route('projects.collections.edit', [project.id, collection.id]),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={collection.name} />

            <ProjectsLayout>
                <ProjectSidebar project={project} />

                <div className="flex-1 min-w-0">
                    <section className="space-y-4">
                        <FieldList
                            projectId={project.id}
                            collectionId={collection.id}
                            initialFields={collection.fields}
                            onAddFieldClick={() => setIsAddFieldModalOpen(true)}
                            collections={project.collections}
                            can={can}
                            headerActions={
                                <div className="rounded-md bg-sidebar/60 p-3 text-sidebar-foreground border border-sidebar-border/70  text-xs">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="grid gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium">UUID:</span>
                                                <span className="text-sidebar-foreground/70">{collection.uuid}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                                    onClick={() => copyToClipboard(collection.uuid)}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                    <span className="sr-only">Copy UUID</span>
                                                </Button>
                                                {copied && <span className="text-xs text-primary">Copied!</span>}
                                            </div>
                                            <div>
                                                <span className="font-medium">Slug:</span>{' '}
                                                <span className="text-sidebar-foreground/70">{collection.slug}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start justify-between gap-18 mt-3">
                                        <div className="grid gap-2">
                                            <div>
                                                <span className="font-medium">Created:</span>{' '}
                                                <span className="text-sidebar-foreground/70">{formatLocalDate(collection.created_at)}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Updated:</span>{' '}
                                                <span className="text-sidebar-foreground/70">{formatLocalDate(collection.updated_at)}</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="shrink-0 self-start"
                                            onClick={() => setTemplateModalOpen(true)}
                                        >
                                            <Save className="mr-2 h-4 w-4" />
                                            Save as Template
                                        </Button>
                                    </div>
                                </div>
                            }
                        />
                    </section>
                </div>
            </ProjectsLayout>

            <AddFieldModal
                isOpen={isAddFieldModalOpen}
                onClose={() => setIsAddFieldModalOpen(false)}
                collectionId={collection.id}
                projectId={project.id}
                collections={project.collections}
                collectionFields={collection.fields}
                can={can}
            />

            <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Collection as Template</DialogTitle>
                        <DialogDescription className="sr-only">Save Collection as Template</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name" />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            onClick={() => setTemplateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTemplate}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
} 