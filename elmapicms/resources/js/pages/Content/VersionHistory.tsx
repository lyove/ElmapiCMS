/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatLocalDateTime, formatRelativeFromNow } from '@/lib/date';
import type { Field } from '@/types';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Eye, History, Loader2, Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Version {
    uuid: string;
    version_number: number;
    label: string | null;
    description: string | null;
    published_at: string | null;
    created_at: string;
    created_by: { id: number; name: string } | null;
    is_current_published: boolean;
}

interface VersionDetail extends Version {
    snapshot: {
        fields?: Record<string, unknown>;
        meta?: Record<string, unknown>;
    } | null;
}

interface VersionHistoryProps {
    projectId: number;
    collectionId: number;
    contentEntryId: number;
    publishedVersionNumber: number | null;
    isDraftDirty: boolean;
    canRevert: boolean;
    fields: Field[];
}

function stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatRefList(value: unknown): string {
    if (!Array.isArray(value) || value.length === 0) {
        return '—';
    }

    return value
        .map((item) => {
            if (item && typeof item === 'object') {
                const ref = item as { uuid?: string; id?: number | string };
                return ref.uuid || (ref.id != null ? String(ref.id) : null);
            }
            return item == null ? null : String(item);
        })
        .filter(Boolean)
        .join(', ');
}

function formatPreviewValue(value: unknown, field?: Field): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (field?.type === 'password') {
        return '••••••••';
    }

    if (field?.type === 'boolean' || typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (field?.type === 'media' || field?.type === 'relation') {
        return formatRefList(value);
    }

    if (field?.type === 'richtext' && typeof value === 'string') {
        return stripHtml(value) || '—';
    }

    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '—';
        }

        if (value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))) {
            return value.map((item) => (item === null || item === undefined ? '—' : String(item))).join(', ');
        }

        return JSON.stringify(value, null, 2);
    }

    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }

    return String(value);
}

function parentFields(fields: Field[]): Field[] {
    return fields
        .filter((field) => !field.parent_field_id)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export default function VersionHistory({
    projectId,
    collectionId,
    contentEntryId,
    publishedVersionNumber,
    isDraftDirty,
    canRevert,
    fields,
}: VersionHistoryProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [versions, setVersions] = useState<Version[]>([]);
    const [revertTarget, setRevertTarget] = useState<Version | null>(null);
    const [reverting, setReverting] = useState(false);
    const [editTarget, setEditTarget] = useState<Version | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [previewTarget, setPreviewTarget] = useState<Version | null>(null);
    const [previewDetail, setPreviewDetail] = useState<VersionDetail | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const baseUrl = `/projects/${projectId}/collections/${collectionId}/content/${contentEntryId}/versions`;
    const discardDraftUrl = `/projects/${projectId}/collections/${collectionId}/content/${contentEntryId}/discard-draft`;

    const previewFields = useMemo(() => parentFields(fields), [fields]);
    const fieldByName = useMemo(() => {
        const map = new Map<string, Field>();
        fields.forEach((field) => map.set(field.name, field));
        return map;
    }, [fields]);

    const loadVersions = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(baseUrl);
            setVersions(data.data || []);
        } catch {
            toast.error('Failed to load versions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            loadVersions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const openPreview = async (version: Version) => {
        setPreviewTarget(version);
        setPreviewDetail(null);
        setPreviewLoading(true);
        try {
            const { data } = await axios.get(`${baseUrl}/${version.version_number}`);
            setPreviewDetail(data);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to load version preview');
            setPreviewTarget(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setPreviewTarget(null);
        setPreviewDetail(null);
    };

    const handleRevert = async () => {
        if (!revertTarget) return;
        setReverting(true);
        try {
            const { data } = await axios.post(`${baseUrl}/${revertTarget.version_number}/revert`);
            toast.success(data.message || `Reverted to version ${revertTarget.version_number}`);
            setRevertTarget(null);
            setOpen(false);
            router.reload();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to revert');
        } finally {
            setReverting(false);
        }
    };

    const openEdit = (version: Version) => {
        setEditTarget(version);
        setEditLabel(version.label ?? '');
        setEditDescription(version.description ?? '');
    };

    const handleDiscardDraft = async () => {
        setDiscarding(true);
        try {
            const { data } = await axios.post(discardDraftUrl);
            toast.success(data.message || 'Draft discarded');
            setDiscardOpen(false);
            router.reload();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to discard draft');
        } finally {
            setDiscarding(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editTarget) return;
        setSavingEdit(true);
        try {
            await axios.patch(`${baseUrl}/${editTarget.version_number}`, {
                label: editLabel || null,
                description: editDescription || null,
            });
            toast.success('Version updated');
            setVersions((prev) =>
                prev.map((v) =>
                    v.version_number === editTarget.version_number
                        ? { ...v, label: editLabel || null, description: editDescription || null }
                        : v,
                ),
            );
            setEditTarget(null);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update version');
        } finally {
            setSavingEdit(false);
        }
    };

    const snapshotFields = previewDetail?.snapshot?.fields ?? {};
    const previewRows = (() => {
        const known = previewFields.map((field) => ({
            key: field.name,
            label: field.label || field.name,
            type: field.type,
            value: snapshotFields[field.name],
            field,
        }));

        const knownNames = new Set(previewFields.map((field) => field.name));
        const extras = Object.keys(snapshotFields)
            .filter((name) => !knownNames.has(name))
            .sort()
            .map((name) => ({
                key: name,
                label: name,
                type: fieldByName.get(name)?.type,
                value: snapshotFields[name],
                field: fieldByName.get(name),
            }));

        return [...known, ...extras];
    })();

    return (
        <>
            <Card className="border-border/70 bg-muted/30 py-2">
                <CardContent className="py-3">
                    <div className="space-y-2">
                        <h3 className="flex items-center space-x-2 text-xs font-medium">
                            <History className="text-muted-foreground h-4 w-4" />
                            <span>Version history</span>
                        </h3>
                        <p className="text-muted-foreground text-xs">
                            {publishedVersionNumber
                                ? `Currently published: v${publishedVersionNumber}`
                                : 'No published versions yet.'}
                        </p>
                        {canRevert && isDraftDirty && publishedVersionNumber !== null && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-500"
                                onClick={() => setDiscardOpen(true)}
                            >
                                <Undo2 className="mr-2 h-4 w-4" />
                                Discard unpublished changes
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setOpen(true)}
                        >
                            <History className="mr-2 h-4 w-4" />
                            View all versions
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Version history</SheetTitle>
                        <SheetDescription>
                            Every publish creates a new immutable version. Revert to restore a prior snapshot as a new version.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-3 px-4 pb-6">
                        {loading && (
                            <div className="text-muted-foreground flex items-center justify-center py-8 text-sm">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading versions...
                            </div>
                        )}
                        {!loading && versions.length === 0 && (
                            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
                                No versions yet. A version will be created the first time this entry is published.
                            </div>
                        )}
                        {!loading &&
                            versions.map((v) => (
                                <div
                                    key={v.uuid}
                                    className={`rounded-md border p-3 ${
                                        v.is_current_published
                                            ? 'border-primary/40 bg-primary/5'
                                            : 'border-border bg-background'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold">v{v.version_number}</span>
                                                {v.is_current_published && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-primary/30 bg-primary/15 text-primary gap-1"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            {v.label && (
                                                <p className="mt-1 text-sm font-medium break-words">{v.label}</p>
                                            )}
                                            {v.description && (
                                                <p className="text-muted-foreground mt-0.5 text-xs break-words whitespace-pre-wrap">
                                                    {v.description}
                                                </p>
                                            )}
                                            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help">
                                                            {formatRelativeFromNow(v.published_at || v.created_at)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {formatLocalDateTime(v.published_at || v.created_at)}
                                                    </TooltipContent>
                                                </Tooltip>
                                                {v.created_by && <span>by {v.created_by.name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openPreview(v)}
                                                title="Preview this version"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openEdit(v)}
                                                title="Edit label & description"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {canRevert && !v.is_current_published && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setRevertTarget(v)}
                                                    title="Revert to this version"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={!!previewTarget} onOpenChange={(o) => !o && closePreview()}>
                <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Preview version v{previewTarget?.version_number}
                            {(previewDetail?.is_current_published || previewTarget?.is_current_published) && (
                                <Badge
                                    variant="outline"
                                    className="border-primary/30 bg-primary/15 text-primary gap-1"
                                >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Current
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Read-only snapshot of field values at publish time. This does not change the live API or your draft.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1">
                        {previewLoading && (
                            <div className="text-muted-foreground flex items-center justify-center py-10 text-sm">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading preview...
                            </div>
                        )}

                        {!previewLoading && previewDetail && (
                            <>
                                {(previewDetail.label || previewDetail.description) && (
                                    <div className="space-y-1 rounded-md border border-border/70 bg-muted/30 p-3">
                                        {previewDetail.label && (
                                            <p className="text-sm font-medium">{previewDetail.label}</p>
                                        )}
                                        {previewDetail.description && (
                                            <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                                                {previewDetail.description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                    <span>
                                        Published {formatLocalDateTime(previewDetail.published_at || previewDetail.created_at)}
                                    </span>
                                    {previewDetail.created_by && <span>by {previewDetail.created_by.name}</span>}
                                </div>

                                <Separator />

                                {previewRows.length === 0 ? (
                                    <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
                                        This version has no field values.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {previewRows.map((row) => {
                                            const formatted = formatPreviewValue(row.value, row.field);
                                            const multiline = formatted.includes('\n') || formatted.length > 120;

                                            return (
                                                <div key={row.key} className="rounded-md border border-border/70 p-3">
                                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium">{row.label}</p>
                                                            <p className="text-muted-foreground text-[11px]">{row.key}</p>
                                                        </div>
                                                        {row.type && (
                                                            <Badge variant="outline" className="shrink-0 text-[10px]">
                                                                {row.type}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`text-sm break-words ${
                                                            multiline
                                                                ? 'bg-muted/40 max-h-48 overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap'
                                                                : 'whitespace-pre-wrap'
                                                        }`}
                                                    >
                                                        {formatted}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <div>
                            {canRevert && previewTarget && !previewTarget.is_current_published && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const target = previewTarget;
                                        closePreview();
                                        setRevertTarget(target);
                                    }}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Revert to this version
                                </Button>
                            )}
                        </div>
                        <Button variant="outline" onClick={closePreview}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Discard unpublished changes?</DialogTitle>
                        <DialogDescription>
                            Your working draft will be reset to match the currently published version (v{publishedVersionNumber}).
                            This does not create a new version or change what is live.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscardOpen(false)} disabled={discarding}>
                            Cancel
                        </Button>
                        <Button
                            className="border-amber-500/30 bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
                            onClick={handleDiscardDraft}
                            disabled={discarding}
                        >
                            {discarding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Undo2 className="mr-2 h-4 w-4" />
                            Discard changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revert confirmation */}
            <Dialog open={!!revertTarget} onOpenChange={(o) => !o && setRevertTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Revert to version {revertTarget?.version_number}?</DialogTitle>
                        <DialogDescription>
                            This will restore the draft to this snapshot and create a new published version from it. Current
                            unpublished draft changes will be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRevertTarget(null)} disabled={reverting}>
                            Cancel
                        </Button>
                        <Button onClick={handleRevert} disabled={reverting}>
                            {reverting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Revert & publish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit label/description */}
            <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit version v{editTarget?.version_number}</DialogTitle>
                        <DialogDescription>
                            The snapshot itself stays immutable. Only the label and description can be edited.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Label</label>
                            <Input
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                placeholder="e.g. Launch copy v2"
                                maxLength={255}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium">Description</label>
                            <Textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={4}
                                maxLength={2000}
                                placeholder="Optional notes about this version"
                            />
                        </div>
                        <Separator />
                        <p className="text-muted-foreground text-xs">
                            {editTarget?.created_by?.name ? `Created by ${editTarget.created_by.name}` : 'Created'}
                            {editTarget?.published_at
                                ? ` • published ${formatLocalDateTime(editTarget.published_at)}`
                                : ''}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={savingEdit}>
                            {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
