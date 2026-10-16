import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Eye, EyeOff, List } from 'lucide-react';

import type { Project, BreadcrumbItem, UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import MultiSelect from '@/components/ui/select/Select';
import { Switch } from '@/components/ui/switch';
import HeadingSmall from '@/components/heading-small';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';

interface Webhook {
    id: number;
    name: string;
    description?: string | null;
    url: string;
    secret?: string | null;
    events: string[];
    sources: string[];
    status: boolean;
    payload: boolean;
    collections: { id: number; name: string }[];
}
type SelectOption = { value: number | string; label: string };
type MultiSelectValue = SelectOption[] | null;

const toMultiSelectValues = (value: unknown): SelectOption[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is SelectOption => {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const candidate = item as { value?: unknown; label?: unknown };
        return (typeof candidate.value === 'number' || typeof candidate.value === 'string') && typeof candidate.label === 'string';
    });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        return message ?? fallback;
    }

    return fallback;
};

interface Props {
    project: Project;
}

const CONTENT_EVENTS = [
    'content.created',
    'content.updated',
    'content.trashed',
    'content.deleted',
    'content.published',
    'content.unpublished',
    'content.restored',
];

const AUTH_EVENTS = [
    'auth.signup.success',
    'auth.login.success',
    'auth.logout.success',
    'auth.logout_all.success',
    'auth.email_verification.verified',
];

const EVENT_GROUPS = [
    {
        label: 'Content Events',
        options: CONTENT_EVENTS.map((eventName) => ({ value: eventName, label: eventName })),
    },
    {
        label: 'Auth Events',
        options: AUTH_EVENTS.map((eventName) => ({ value: eventName, label: eventName })),
    },
];

export default function WebhooksSettings({ project }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Webhooks', href: route('projects.settings.webhooks', project.id) },
    ];

    const can = usePage().props.userCan as UserCan;
    const collections = project.collections ?? [];
    const allCollectionIds = collections.map((collection) => collection.id);
    const collectionOptions = collections.map((collection) => ({ value: collection.id, label: collection.name }));

    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [loading, setLoading] = useState(true);

    const [showDialog, setShowDialog] = useState(false);
    const [editing, setEditing] = useState<Webhook | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [secretVisible, setSecretVisible] = useState(false);
    const [collectionIds, setCollectionIds] = useState<number[]>([]);
    const [eventsField, setEventsField] = useState<string[]>([CONTENT_EVENTS[0]]);
    const [sourcesField, setSourcesField] = useState<string[]>(['cms']);
    const [payload, setPayload] = useState<boolean>(true);
    const [status, setStatus] = useState<boolean>(true);

    const [errors, setErrors] = useState<Record<string,string[]>>({});

    const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);
    const [eventsModalWebhook, setEventsModalWebhook] = useState<Webhook | null>(null);

    const allCollectionsSelected =
        collections.length > 0 && collections.every((collection) => collectionIds.includes(collection.id));

    const toggleSelectAllCollections = () => {
        setCollectionIds(allCollectionsSelected ? [] : allCollectionIds);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('projects.settings.webhooks.index', [project.id]));
            setWebhooks(res.data);
        } catch {
            toast.error('Failed to load webhooks');
        }
        setLoading(false);
    }, [project.id]);

    useEffect(() => {
        load();
    }, [load]);

    const reset = () => {
        setEditing(null);
        setName('');
        setDescription('');
        setUrl('');
        setSecret('');
        setCollectionIds([]);
        setEventsField([CONTENT_EVENTS[0]]);
        setSourcesField(['cms']);
        setPayload(true);
        setStatus(true);
        setErrors({});
    };

    const save = async () => {
        try {
            const data = { name, description, url, secret, collection_ids: collectionIds, events: eventsField, sources: sourcesField, payload, status };
            if (editing) {
                await axios.put(route('projects.settings.webhooks.update', [project.id, editing.id]), data);
                toast.success('Updated');
            } else {
                await axios.post(route('projects.settings.webhooks.store', project.id), data);
                toast.success('Created');
            }
            setShowDialog(false);
            reset();
            load();
            setErrors({});
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                const errorBag = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
                setErrors(errorBag ?? {});
            } else {
                toast.error(getErrorMessage(error, 'Failed to save'));
            }
        }
    };

    const confirmDeleteWebhook = async () => {
        if(!webhookToDelete) return;
        try {
            await axios.delete(route('projects.settings.webhooks.destroy', [project.id, webhookToDelete.id]));
            setWebhooks(webhooks.filter(w=>w.id!==webhookToDelete.id));
            toast.success('Webhook deleted');
            setWebhookToDelete(null);
            setShowDialog(false);
        } catch { toast.error('Failed'); }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Webhooks settings" />

            <ProjectSettingsLayout project={project}>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <HeadingSmall title="Webhooks" />
                        {can.access_webhooks_settings && (
                            <Button size="sm" onClick={() => { reset(); setShowDialog(true); }}><Plus className="w-4 h-4 mr-1" /> New Webhook</Button>
                        )}
                    </div>

                    {loading ? (
                        <p className="text-sidebar-foreground/70">Loading...</p>
                    ) : webhooks.length === 0 ? (
                        <p className="text-sidebar-foreground/70">No webhooks yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-md border border-sidebar-border/70 bg-sidebar">
                            <table className="min-w-full text-sm text-sidebar-foreground">
                                <thead className="border-b border-sidebar-border/70 bg-sidebar/60">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Name</th>
                                        <th className="px-4 py-2 text-left">URL</th>
                                        <th className="px-4 py-2 text-left">Collections</th>
                                        <th className="px-4 py-2 text-left">Events</th>
                                        <th className="px-4 py-2 text-left">Sources</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                        <th className="px-4 py-2 text-left">Logs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {webhooks.map(w => (
                                        <tr key={w.id} className="cursor-pointer border-t border-sidebar-border/70 hover:bg-sidebar-accent/30" onClick={() => { 
                                            setEditing(w);
                                            setName(w.name);
                                            setDescription(w.description ?? '');
                                            setUrl(w.url);
                                            setSecret(w.secret ?? '');
                                            setCollectionIds(w.collections?.map(c=>c.id) ?? []);
                                            setEventsField(w.events);
                                            setSourcesField(w.sources);
                                            setPayload(w.payload);
                                            setStatus(w.status);
                                            setShowDialog(true);
                                        }}>
                                            <td className="px-4 py-2">{w.name}</td>
                                            <td className="px-4 py-2">{w.url}</td>
                                            <td className="px-4 py-2">
                                                {w.collections.length === 0
                                                    ? 'All collections'
                                                    : w.collections.map((c) => c.name).join(', ')}
                                            </td>
                                            <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="shrink-0"
                                                    title={`${w.events.length} event${w.events.length === 1 ? '' : 's'} — click to view`}
                                                    aria-label={`View webhook events (${w.events.length})`}
                                                    onClick={() => setEventsModalWebhook(w)}
                                                >
                                                    <List className="size-4" />
                                                </Button>
                                            </td>
                                            <td className="px-4 py-2">{w.sources.join(', ')}</td>
                                            <td className="px-4 py-2">{w.status ? 'Active':'Inactive'}</td>
                                            <td className="px-4 py-2" onClick={(e)=>e.stopPropagation()}><Button variant="outline" size="icon" onClick={()=>{
                                                router.visit(route('projects.settings.webhooks.logs', [project.id, w.id]));
                                            }}><Eye className="w-4 h-4"/></Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <Sheet open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); reset(); } }}>
                    <SheetContent
                        side="right"
                        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
                    >
                        <SheetHeader className="border-b border-border/60 px-6 pb-4 pt-2 text-left">
                            <SheetTitle>{editing ? 'Edit Webhook' : 'Create Webhook'}</SheetTitle>
                            <SheetDescription>Configure your webhook details below.</SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
                            <div>
                                <Label>Name</Label>
                                <Input name="webhook_name" autoComplete="off" value={name} onChange={e=>setName(e.target.value)} />
                                <InputError message={errors.name?.[0]} />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input name="webhook_description" autoComplete="off" value={description} onChange={e=>setDescription(e.target.value)} />
                                <InputError message={errors.description?.[0]} />
                            </div>
                            <div>
                                <Label>URL</Label>
                                <Input name="webhook_url" autoComplete="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://" />
                                <InputError message={errors.url?.[0]} />
                            </div>
                            <div>
                                <Label>Secret</Label>
                                <div className="flex gap-2 items-center">
                                    <Input name="webhook_secret" autoComplete="new-password" type={secretVisible ? 'text':'password'} value={secret} onChange={e=>setSecret(e.target.value)} />
                                    <Button variant="outline" size="icon" onClick={()=>setSecretVisible(!secretVisible)}>{secretVisible? <Eye className="w-4 h-4"/>:<EyeOff className="w-4 h-4"/>}</Button>
                                    <Button variant="secondary" size="sm" onClick={()=>setSecret(Math.random().toString(36).slice(2,18) + Math.random().toString(36).slice(2,18))}>Generate</Button>
                                </div>
                                <InputError message={errors.secret?.[0]} />
                            </div>
                            <div>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <Label>Collections</Label>
                                    {collections.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="h-auto px-0 py-0 text-xs"
                                            onClick={toggleSelectAllCollections}
                                        >
                                            {allCollectionsSelected ? 'Clear' : 'Select all'}
                                        </Button>
                                    )}
                                </div>
                                <MultiSelect
                                    isMulti
                                    options={collectionOptions}
                                    value={collections
                                        .filter((c) => collectionIds.includes(c.id))
                                        .map((c) => ({ value: c.id, label: c.name }))}
                                    onChange={(newValue: unknown) => setCollectionIds(toMultiSelectValues(newValue as MultiSelectValue).map((v) => Number(v.value)))}
                                    classNamePrefix="rs"
                                    placeholder="All collections"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Leave empty to receive events from all collections, including ones added later.
                                </p>
                                <InputError message={errors.collection_ids?.[0]} />
                            </div>
                            <div>
                                <Label>Events</Label>
                                <MultiSelect
                                    isMulti
                                    options={EVENT_GROUPS}
                                    value={eventsField.map((e) => ({ value: e, label: e }))}
                                    onChange={(newValue: unknown) => setEventsField(toMultiSelectValues(newValue as MultiSelectValue).map((v) => String(v.value)))}
                                    classNamePrefix="rs"
                                />
                                <InputError message={errors.events?.[0]} />
                            </div>
                            <div>
                                <Label>Sources</Label>
                                <MultiSelect
                                    isMulti
                                    options={['cms', 'api'].map((s) => ({ value: s, label: s }))}
                                    value={sourcesField.map((s) => ({ value: s, label: s }))}
                                    onChange={(newValue: unknown) => setSourcesField(toMultiSelectValues(newValue as MultiSelectValue).map((v) => String(v.value)))}
                                    classNamePrefix="rs"
                                />
                                <InputError message={errors.sources?.[0]} />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium flex items-center gap-2">Include Payload <Switch checked={payload} onCheckedChange={setPayload} /></label>
                                <label className="text-sm font-medium flex items-center gap-2">Active <Switch checked={status} onCheckedChange={setStatus} /></label>
                            </div>
                        </div>

                        <SheetFooter className="mt-0 flex flex-row flex-wrap items-center justify-between gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-between">
                            <div>
                                {editing && (
                                    <Button variant="destructive" size="sm" type="button" onClick={() => setWebhookToDelete(editing)}>
                                        Delete
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" type="button" onClick={() => setShowDialog(false)}>
                                    Close
                                </Button>
                                <Button type="button" onClick={save} disabled={!name || !url}>
                                    Save
                                </Button>
                            </div>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>

                {/* Delete confirmation dialog */}
                <AlertDialog open={webhookToDelete!==null} onOpenChange={(o)=>{ if(!o) setWebhookToDelete(null); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this webhook? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <Button variant="destructive" onClick={confirmDeleteWebhook}>Delete</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Dialog open={eventsModalWebhook !== null} onOpenChange={(open) => { if (!open) setEventsModalWebhook(null); }}>
                    <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <DialogHeader>
                            <DialogTitle>Events</DialogTitle>
                            <DialogDescription>
                                {eventsModalWebhook ? (
                                    <>
                                        Subscribed events for <span className="font-medium text-foreground">{eventsModalWebhook.name}</span>.
                                    </>
                                ) : null}
                            </DialogDescription>
                        </DialogHeader>
                        {eventsModalWebhook && (
                            eventsModalWebhook.events.length > 0 ? (
                                <ul className="max-h-[min(60vh,24rem)] space-y-1.5 overflow-y-auto rounded-md border border-sidebar-border/70 bg-sidebar/40 p-3">
                                    {eventsModalWebhook.events.map((eventName) => (
                                        <li key={eventName} className="font-mono text-sm text-sidebar-foreground">
                                            {eventName}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-sidebar-foreground/70">No events selected for this webhook.</p>
                            )
                        )}
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setEventsModalWebhook(null)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 