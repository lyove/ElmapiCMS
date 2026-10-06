import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Copy, Save, Layers, FileText, Image, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

import { type Project, type BreadcrumbItem, UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatLocalDateTime } from '@/lib/date';

import ProjectSidebar from './ProjectSidebar';
import ProjectsLayout from './layout';

interface Props {
    project: Project;
}

export default function Show({ project }: Props) {
    const { props } = usePage();
    const can = props.userCan as UserCan;

    const { isCopied, copyToClipboard } = useCopyToast();

    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templateName, setTemplateName] = useState(project.name);
    const [templateDesc, setTemplateDesc] = useState(project.description ?? '');

    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [cloneName, setCloneName] = useState(project.name + ' Copy');
    const [cloneDesc, setCloneDesc] = useState(project.description ?? '');
    const [isCursorJsonExpanded, setIsCursorJsonExpanded] = useState(false);
    const [isClaudeCommandExpanded, setIsClaudeCommandExpanded] = useState(false);

    const slugify = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const handleSaveTemplate = async () => {
        try {
            await axios.post(route('projects.saveAsTemplate', project.id), {
                name: templateName,
                slug: slugify(templateName),
                description: templateDesc,
            });
            toast.success('Template saved');
            setTemplateModalOpen(false);
        } catch (e) {
            console.error(e);
            toast.error('Failed to save template');
        }
    };

    const handleCloneProject = async () => {
        try {
            const res = await axios.post(route('projects.clone', project.id), {
                name: cloneName,
                description: cloneDesc,
            });
            const redirect = res.data?.redirect;
            if (redirect) {
                window.location.href = redirect;
            } else {
                toast.success('Project cloned');
                setCloneModalOpen(false);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to clone project');
        }
    };

    const diskLabel = project.disk === 'public' ? 'Local Storage' : project.disk.toUpperCase();
    const mcpBaseUrl = `${new URL(props.ziggy.location).origin}/api`;
    const mcpEnv: Record<string, string> = {
        ELMAPI_BASE_URL: mcpBaseUrl,
        ELMAPI_API_KEY: 'your-api-key',
        ELMAPI_PROJECT_ID: project.uuid,
    };
    const cursorMcpJson = JSON.stringify(
        {
            mcpServers: {
                elmapicms: {
                    command: 'npx',
                    args: ['-y', '@elmapicms/mcp-server'],
                    env: mcpEnv,
                },
            },
        },
        null,
        2,
    );
    const claudeMcpCommand = `claude mcp add elmapicms \\
  -e ELMAPI_BASE_URL=${mcpBaseUrl} \\
  -e ELMAPI_API_KEY=your-api-key \\
  -e ELMAPI_PROJECT_ID=${project.uuid} \\
  -- npx -y @elmapicms/mcp-server`;
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: '/project',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />

            <ProjectsLayout>
                <ProjectSidebar project={project} />

                <div className="flex-1 min-w-0">
                    <section className="space-y-6">
                        

                        <div className="rounded-lg border p-6 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <h2 className="text-2xl font-bold">{project.name}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            {project.description || 'No description'}
                                        </p>
                                        {project.preview_url && (
                                            <a
                                                href={project.preview_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-sm text-primary underline-offset-2 hover:underline"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{project.preview_url}</span>
                                            </a>
                                        )}
                                    </div>
                                    {/* Badges and top-right actions */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {project.public_api && (
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                Public API
                                            </Badge>
                                        )}
                                        {/* Actions */}
                                        <CompactStatItem
                                            icon={Layers}
                                            iconColor="text-indigo-500"
                                            label="Collections"
                                            value={project.collections_count ?? project.collections?.length ?? 0}
                                        />
                                        <CompactStatItem
                                            icon={FileText}
                                            iconColor="text-sky-500"
                                            label="Entries"
                                            value={project.content_count ?? 0}
                                        />
                                        <CompactStatItem
                                            icon={Image}
                                            iconColor="text-pink-500"
                                            label="Assets"
                                            value={project.assets_count ?? 0}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex items-center gap-1"
                                            onClick={() => setTemplateModalOpen(true)}
                                        >
                                            <Save className="h-4 w-4 text-emerald-500" />
                                            <span className="hidden sm:inline">Template</span>
                                        </Button>
                                        {can.create_project && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex items-center gap-1"
                                                onClick={() => setCloneModalOpen(true)}
                                            >
                                                <Copy className="h-4 w-4 text-blue-500" />
                                                <span className="hidden sm:inline">Clone</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-5">
                                        <div>
                                            <h3 className="text-sm font-medium">Project ID</h3>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground break-all">{project.uuid}</p>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyToClipboard(project.uuid, 'project-id')}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                    <span className="sr-only">Copy UUID</span>
                                                </Button>
                                                {isCopied('project-id') && <span className="text-xs text-green-500">Copied!</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Storage</h3>
                                            <p className="text-sm text-muted-foreground uppercase">{diskLabel}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Default Locale</h3>
                                            <p className="text-sm text-muted-foreground uppercase">
                                                {project.default_locale}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Available Locales</h3>
                                            <p className="text-sm text-muted-foreground uppercase">
                                                {(project.locales?.length ? project.locales.join(', ') : project.default_locale).toUpperCase()}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Public API</h3>
                                            <p className="text-sm text-muted-foreground uppercase">
                                                {project.public_api ? <Badge variant="default" className="flex items-center gap-1">
                                                    Enabled
                                                </Badge> : <Badge variant="outline" className="flex items-center gap-1">
                                                    Disabled
                                                </Badge>}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Created At</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {formatLocalDateTime(project.created_at)}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium">Last Updated</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {formatLocalDateTime(project.updated_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2 rounded-md border border-dashed p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-sm font-medium">Cursor MCP JSON</h3>
                                                <div className="flex items-center gap-2">
                                                    {isCopied('cursor-mcp-json') && (
                                                        <span className="text-xs text-green-500">Copied!</span>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(cursorMcpJson, 'cursor-mcp-json')}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                className="relative block w-full text-left"
                                                onClick={() => {
                                                    if (!isCursorJsonExpanded) {
                                                        setIsCursorJsonExpanded(true);
                                                    }
                                                }}
                                                onKeyDown={event => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        if (!isCursorJsonExpanded) {
                                                            setIsCursorJsonExpanded(true);
                                                        }
                                                    }
                                                }}
                                                aria-label={isCursorJsonExpanded ? 'Cursor MCP JSON' : 'Expand Cursor MCP JSON'}
                                            >
                                                <Textarea
                                                    readOnly
                                                    value={cursorMcpJson}
                                                    onClick={event => {
                                                        if (isCursorJsonExpanded) {
                                                            event.stopPropagation();
                                                        }
                                                    }}
                                                    className={`font-mono text-[10px] leading-relaxed md:text-[10px] transition-[height] duration-200 ${
                                                        isCursorJsonExpanded ? 'h-64 cursor-text' : 'h-24 cursor-pointer'
                                                    }`}
                                                />
                                                {!isCursorJsonExpanded && (
                                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-12 items-end justify-center rounded-b-md bg-gradient-to-t from-background to-transparent pb-1 text-[11px] text-muted-foreground">
                                                        Click to expand
                                                    </div>
                                                )}
                                            </div>
                                            {isCursorJsonExpanded && (
                                                <div className="flex justify-center pt-1">
                                                    <button
                                                        type="button"
                                                        className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                                                        onClick={() => setIsCursorJsonExpanded(false)}
                                                    >
                                                        Click to collapse
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2 rounded-md border border-dashed p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-sm font-medium">Claude MCP Command</h3>
                                                <div className="flex items-center gap-2">
                                                    {isCopied('claude-mcp-command') && (
                                                        <span className="text-xs text-green-500">Copied!</span>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => copyToClipboard(claudeMcpCommand, 'claude-mcp-command')}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                className="relative block w-full text-left"
                                                onClick={() => {
                                                    if (!isClaudeCommandExpanded) {
                                                        setIsClaudeCommandExpanded(true);
                                                    }
                                                }}
                                                onKeyDown={event => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        if (!isClaudeCommandExpanded) {
                                                            setIsClaudeCommandExpanded(true);
                                                        }
                                                    }
                                                }}
                                                aria-label={isClaudeCommandExpanded ? 'Claude MCP command' : 'Expand Claude MCP command'}
                                            >
                                                <Textarea
                                                    readOnly
                                                    value={claudeMcpCommand}
                                                    onClick={event => {
                                                        if (isClaudeCommandExpanded) {
                                                            event.stopPropagation();
                                                        }
                                                    }}
                                                    className={`font-mono text-[10px] leading-relaxed md:text-[10px] transition-[height] duration-200 ${
                                                        isClaudeCommandExpanded ? 'h-52 cursor-text' : 'h-24 cursor-pointer'
                                                    }`}
                                                />
                                                {!isClaudeCommandExpanded && (
                                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-12 items-end justify-center rounded-b-md bg-gradient-to-t from-background to-transparent pb-1 text-[11px] text-muted-foreground">
                                                        Click to expand
                                                    </div>
                                                )}
                                            </div>
                                            {isClaudeCommandExpanded && (
                                                <div className="flex justify-center pt-1">
                                                    <button
                                                        type="button"
                                                        className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                                                        onClick={() => setIsClaudeCommandExpanded(false)}
                                                    >
                                                        Click to collapse
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </ProjectsLayout>

            {/* Save Template Modal */}
            <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Project as Template</DialogTitle>
                        <DialogDescription className="sr-only">Save Project as Template</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="tpl_name">Template Name</label>
                            <Input id="tpl_name" value={templateName} onChange={e => setTemplateName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="tpl_desc">Description</label>
                            <Textarea id="tpl_desc" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} rows={3} />
                        </div>
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

            {/* Clone Project Modal */}
            <Dialog open={cloneModalOpen} onOpenChange={setCloneModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clone Project</DialogTitle>
                        <DialogDescription className="sr-only">Clone Project</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="clone_name">New Project Name</label>
                            <Input id="clone_name" value={cloneName} onChange={e => setCloneName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="clone_desc">Description</label>
                            <Textarea id="clone_desc" value={cloneDesc} onChange={e => setCloneDesc(e.target.value)} rows={3} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            onClick={() => setCloneModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCloneProject}>Clone</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function useCopyToast() {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const copyToClipboard = async (text: string, key?: string) => {
        try {
            await navigator.clipboard.writeText(text);
            if (!key) {
                return;
            }
            setCopiedKey(key);
            setTimeout(() => {
                setCopiedKey(currentKey => (currentKey === key ? null : currentKey));
            }, 2000);
        } catch (e) {
            console.error('Failed to copy', e);
        }
    };

    const isCopied = (key: string) => copiedKey === key;

    return { isCopied, copyToClipboard };
}

interface CompactStatItemProps {
    icon: React.ComponentType<{ className?: string }>;
    iconColor?: string;
    label: string;
    value: number;
}

function CompactStatItem({ icon: Icon, iconColor, label, value }: CompactStatItemProps) {
    return (
        <div className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
            <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${iconColor ?? 'text-muted-foreground'}`} />
                <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
            <p className="text-sm font-semibold">{value}</p>
        </div>
    );
}
