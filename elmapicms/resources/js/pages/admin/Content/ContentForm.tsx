/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { router, usePage } from '@inertiajs/react';
import { slugify } from '@/admin/lib/utils';
import { formatLocalDate, formatLocalDateTime, formatRelativeFromNow } from '@/admin/lib/date';

import type { Project, Collection, Field, UserCan, ContentEntry } from "@/admin/types";

import { Button } from "@/admin/components/ui/button";
import {  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/admin/components/ui/dropdown-menu";
import { ChevronDown, Clock, FileText, Calendar, User, Globe2, Copy, Key, AlertCircle, Trash2, X, CheckCircle2, Languages, Sparkles, Loader2, Plus, MoreHorizontal } from "lucide-react";
import { ContentAiUsageProvider, useContentAiUsage } from '@/admin/contexts/content-ai-usage-context';
import { ContentAiFormProvider, type FieldSummary } from '@/admin/contexts/content-ai-form-context';
import { renderField } from './Fields';
import { Card, CardContent } from "@/admin/components/ui/card";
import { Separator } from "@/admin/components/ui/separator";
import { Badge } from "@/admin/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/admin/components/ui/dialog";
import Select from "@/admin/components/ui/select/Select";
import TranslationSelectModal from "./TranslationSelectModal";
import VersionHistory from "./VersionHistory";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/admin/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/admin/components/ui/tooltip';
import { UnsavedChangesDialog } from '@/admin/components/unsaved-changes-dialog';
import { useUnsavedChangesGuard } from '@/admin/hooks/use-unsaved-changes-guard';

interface Props {
    project: Project;
    collection: Collection & {
        fields: Field[];
    };
    contentEntry?: any;
    formData?: Record<string, any>;
    isEditMode?: boolean;
}

type SaveAction = 'stay' | 'close' | 'new';
type SaveState = 'draft' | 'published';

export default function ContentForm({ project, collection, contentEntry, formData: initialFormData, isEditMode }: Props) {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const userHasInteractedRef = React.useRef(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Dialog states
    const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
    const [showTrashDialog, setShowTrashDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [showTranslationsDialog, setShowTranslationsDialog] = useState(false);
    const [translations, setTranslations] = useState<Record<string, any>>({});
    const [loadingTranslations, setLoadingTranslations] = useState(false);
    const [showTranslationSelectModal, setShowTranslationSelectModal] = useState(false);
    const [selectedLocaleForTranslation, setSelectedLocaleForTranslation] = useState<string | null>(null);
    const [aiTranslatingLocale, setAiTranslatingLocale] = useState<string | null>(null);
    const [aiTranslateProgress, setAiTranslateProgress] = useState<string>('');
    const [showAiTranslateConfirm, setShowAiTranslateConfirm] = useState<string | null>(null);
    const [aiTranslateResult, setAiTranslateResult] = useState<{ entryId: number; locale: string; usage?: { prompt_tokens: number; completion_tokens: number } } | null>(null);
    const [showSidebarSheet, setShowSidebarSheet] = useState(false);
    const isAiTranslationRunning = !!aiTranslatingLocale;

    const can = usePage().props.userCan as UserCan;
    const aiEnabled = (usePage().props as any).aiEnabled as boolean;
    const aiUsage = useContentAiUsage();
    const is_singleton = collection.is_singleton;
    const contentState = contentEntry?.state;

    // Organize fields: separate parent fields from children and attach children to their parents
    const organizedFields = React.useMemo(() => {
        const parentFields = collection.fields.filter(f => !f.parent_field_id);
        const childFieldsByParent = collection.fields
            .filter(f => f.parent_field_id)
            .reduce((acc, field) => {
                const parentId = field.parent_field_id!;
                if (!acc[parentId]) {
                    acc[parentId] = [];
                }
                acc[parentId].push(field);
                return acc;
            }, {} as Record<number, Field[]>);
        
        // Attach children to their parent fields
        return parentFields.map(field => ({
            ...field,
            children: childFieldsByParent[field.id] || []
        }));
    }, [collection.fields]);

    // Locale state
    const projLocales = (project as any).locales as string[] | undefined;
    const availableLocales = Array.isArray(projLocales) && projLocales.length ? projLocales : [project.default_locale || 'en'];
    const [locale, setLocale] = useState<string>(contentEntry?.locale || project.default_locale || availableLocales[0]);

    const { allowNavigation, cancelLeave, confirmLeave, showLeaveConfirm } = useUnsavedChangesGuard(hasUnsavedChanges);

    const markSaved = () => {
        userHasInteractedRef.current = false;
        setHasUnsavedChanges(false);
    };

    const markUserInteraction = () => {
        userHasInteractedRef.current = true;
    };

    useEffect(() => {
        userHasInteractedRef.current = false;
        setHasUnsavedChanges(false);

        // If we have initial form data (for editing), normalise it first (e.g. media fields should be arrays of IDs)
        if (initialFormData && Object.keys(initialFormData).length > 0) {
            const normalisedData: Record<string, any> = { ...initialFormData };

            // Helper to pull the ID off either an object or primitive
            const extractId = (val: any) => (val && typeof val === 'object' ? val.id ?? null : val ?? null);

            // Helper to normalize media field value
            const normalizeMediaValue = (rawValue: any, field: Field) => {
                // Determine if this media field actually supports multiple files
                const allowsMultiple =
                    Boolean(field.options?.multiple) ||
                    (field.options?.media?.type === 2) ||
                    Array.isArray(rawValue);

                if (allowsMultiple) {
                    // Ensure we end up with an array of IDs (empty when none)
                    return Array.isArray(rawValue)
                        ? rawValue.map(extractId).filter((id: any) => id !== null)
                        : [];
                } else {
                    // Single media: reduce to the single ID (or null) and still store as an array for consistency
                    const id = Array.isArray(rawValue) ? extractId(rawValue[0]) : extractId(rawValue);
                    return id !== null ? [id] : [];
                }
            };

            // Iterate over organized fields to apply any type-specific normalisation rules
            organizedFields.forEach(field => {
                if (field.type === 'media') {
                    // Top-level media field
                    const rawValue = initialFormData[field.name];
                    normalisedData[field.name] = normalizeMediaValue(rawValue, field);
                } else if (field.type === 'group') {
                    // Normalize media fields inside group instances
                    const groupValue = initialFormData[field.name];
                    if (Array.isArray(groupValue)) {
                        normalisedData[field.name] = groupValue.map((instance: any) => {
                            const normalizedInstance = { ...instance };
                            field.children?.forEach((childField: Field) => {
                                if (childField.type === 'media' && instance[childField.name] !== undefined) {
                                    normalizedInstance[childField.name] = normalizeMediaValue(instance[childField.name], childField);
                                }
                            });
                            return normalizedInstance;
                        });
                    } else if (groupValue && typeof groupValue === 'object') {
                        // Single non-repeatable group
                        const normalizedInstance = { ...groupValue };
                        field.children?.forEach((childField: Field) => {
                            if (childField.type === 'media' && groupValue[childField.name] !== undefined) {
                                normalizedInstance[childField.name] = normalizeMediaValue(groupValue[childField.name], childField);
                            }
                        });
                        normalisedData[field.name] = [normalizedInstance];
                    }
                }
            });

            setFormData(normalisedData);
            return;
        }
        
        // Otherwise initialize form data for each field
        const newFormData: Record<string, any> = {};
        organizedFields.forEach(field => {
            if (field.type === 'group') {
                // Initialize field group
                if (field.options?.repeatable) {
                    newFormData[field.name] = [];
                } else {
                    // Single group instance - initialize with empty object
                    const instance: Record<string, any> = {};
                    if (field.children) {
                        field.children.forEach(child => {
                            if (child.type === 'boolean') {
                                instance[child.name] = false;
                            } else if (child.type === 'enumeration' && child.options?.multiple) {
                                instance[child.name] = [];
                            } else if (['media', 'relation'].includes(child.type)) {
                                instance[child.name] = [];
                            } else if (child.type === 'json') {
                                instance[child.name] = null;
                            } else {
                                instance[child.name] = '';
                            }
                        });
                    }
                    newFormData[field.name] = [instance];
                }
            } else if (field.options?.repeatable) {
                newFormData[field.name] = [{ value: null }];
            } else if (field.type === 'enumeration' && field.options?.multiple) {
                newFormData[field.name] = [];
            } else if (field.type === 'boolean') {
                newFormData[field.name] = false;
            } else if (field.type === 'media') {
                newFormData[field.name] = [];
            } else if (field.type === 'relation') {
                newFormData[field.name] = [];
            } else if (field.type === 'json') {
                newFormData[field.name] = null;
            } else {
                newFormData[field.name] = '';
            }
        });
        setFormData(newFormData);
    }, [collection, initialFormData, organizedFields]);

    const handleSubmit = async (action: SaveAction, state: SaveState) => {
        setProcessing(true);
        setErrors({});

        try {
            let response;
            let entryIdForPublish: number | undefined;

            if (isEditMode && contentEntry) {
                response = await axios.put(
                    route('projects.collections.content.update', {
                        project: project.id,
                        collection: collection.id,
                        contentEntry: contentEntry.id
                    }),
                    { data: formData, locale }
                );
                entryIdForPublish = contentEntry.id;
            } else {
                response = await axios.post(
                    route('projects.collections.content.store', {
                        project: project.id,
                        collection: collection.id
                    }),
                    { data: formData, state, locale }
                );
                entryIdForPublish = response.data.entry_id;
            }

            if (state === 'published' && isEditMode && entryIdForPublish) {
                const publishResponse = await axios.put(
                    route('projects.collections.content.publish', {
                        project: project.id,
                        collection: collection.id,
                        contentEntry: entryIdForPublish,
                    }),
                );
                response = publishResponse;
            }

            toast.success(
                state === 'draft' && isEditMode && contentState === 'published'
                    ? 'Draft saved. The live published version is unchanged.'
                    : (response.data.message || 'Content saved successfully')
            );
            
            // Handle different actions after save
            if (action === 'close' || (!isEditMode && !can.update_content)) {
                markSaved();
                allowNavigation();
                // Redirect to collection page
                router.visit(route('projects.collections.show', {
                    project: project.id,
                    collection: collection.id
                }));
            } else if (action === 'new') {
                // Reset form for a new entry
                const newFormData: Record<string, any> = {};
                collection.fields.forEach(field => {
                    if (field.options?.repeatable) {
                        newFormData[field.name] = [{ value: null }];
                    } else if (field.type === 'enumeration' && field.options?.multiple) {
                        newFormData[field.name] = [];
                    } else if (field.type === 'boolean') {
                        newFormData[field.name] = false;
                    } else if (field.type === 'media') {
                        newFormData[field.name] = [];
                    } else if (field.type === 'relation') {
                        newFormData[field.name] = [];
                    } else if (field.type === 'json') {
                        newFormData[field.name] = null;
                    } else {
                        newFormData[field.name] = '';
                    }
                });
                setFormData(newFormData);
                markSaved();
                window.scrollTo(0, 0);
            } else if (action === 'stay' && !isEditMode && can.update_content && response.data.entry_id) {
                // If this is a new entry and we want to stay, redirect to edit mode
                const entryId = response.data.entry_id;
                
                markSaved();
                allowNavigation();
                // Use setTimeout to ensure the response is fully processed
                setTimeout(() => {
                    router.visit(route('projects.collections.content.edit', {
                        project: project.id,
                        collection: collection.id,
                        contentEntry: entryId
                    }));
                }, 100);
            } else if (action === 'stay' && isEditMode) {
                markSaved();
                allowNavigation();
                // Refresh the page to reflect the updated status
                router.reload();
            }
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toast.error('Failed to save content. Please check the form for errors.');
            } else {
                toast.error('An error occurred while saving content.');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleUnpublish = async () => {
        if (!contentEntry) return;
        setProcessing(true);

        try {
            await axios.put(
                route('projects.collections.content.unpublish', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: contentEntry.id,
                }),
            );
            toast.success('Content unpublished');
            setShowUnpublishDialog(false);
            allowNavigation();
            router.reload();
        } catch {
            toast.error('Failed to unpublish content');
        } finally {
            setProcessing(false);
        }
    };

    const handleMoveToTrash = async () => {
        setProcessing(true);
        
        try {
            const response = await axios.delete(
                route('projects.collections.content.destroy', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: contentEntry.id
                })
            );
            
            toast.success(response.data.message || 'Content moved to trash successfully');
            
            allowNavigation();
            // Redirect to collection page
            router.visit(route('projects.collections.show', {
                project: project.id,
                collection: collection.id
            }));
        } catch {
            toast.error('Failed to move content to trash.');
        } finally {
            setProcessing(false);
            setShowTrashDialog(false);
        }
    };

    const handleDelete = async () => {
        setProcessing(true);
        
        try {
            const response = await axios.delete(
                route('projects.collections.content.forceDestroy', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: contentEntry.id
                })
            );
            
            toast.success(response.data.message || 'Content permanently deleted');
            
            allowNavigation();
            // Redirect to collection page
            router.visit(route('projects.collections.show', {
                project: project.id,
                collection: collection.id
            }));
        } catch {
            toast.error('Failed to delete content.');
        } finally {
            setProcessing(false);
            setShowDeleteDialog(false);
        }
    };

    const handleDuplicate = async () => {
        setProcessing(true);
        try {
            const response = await axios.post(route('projects.collections.content.duplicate', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }));

            toast.success(response.data.message || 'Content duplicated');

            const newId = response.data.entry_id;
            if (newId) {
                allowNavigation();
                router.visit(route('projects.collections.content.edit', {
                    project: project.id,
                    collection: collection.id,
                    contentEntry: newId,
                }));
            } else {
                allowNavigation();
                router.reload();
            }
        } catch {
            toast.error('Failed to duplicate content');
        } finally {
            setProcessing(false);
            setShowDuplicateDialog(false);
        }
    };

    const fetchTranslations = async () => {
        await fetchTranslationsWithGroupId();
    };
    
    const fetchTranslationsWithGroupId = async (translationGroupId?: string) => {
        if (!contentEntry) return;
        
        setLoadingTranslations(true);
        try {
            const translationsMap: Record<string, any> = {};
            
            // Use provided translation_group_id or fall back to contentEntry's
            const groupId = translationGroupId || (contentEntry as any).translation_group_id;
            
            // Fetch entries for each locale
            for (const loc of availableLocales) {
                if (loc === contentEntry.locale) {
                    // Current entry
                    translationsMap[loc] = contentEntry;
                } else if (groupId) {
                    // Find entry in the same translation group with this locale
                    try {
                        const response = await axios.get(route('projects.collections.content.search', {
                            project: project.id,
                            collection: collection.id,
                        }), {
                            params: {
                                filter_locale: loc,
                                per_page: 100,
                            }
                        });
                        
                        // Find entry with matching translation_group_id
                        const linkedEntry = response.data.data?.find((entry: any) => 
                            entry.translation_group_id === groupId
                        );
                        
                        translationsMap[loc] = linkedEntry || null;
                    } catch {
                        translationsMap[loc] = null;
                    }
                } else {
                    // No translation group yet
                    translationsMap[loc] = null;
                }
            }
            
            setTranslations(translationsMap);
        } catch {
            toast.error('Failed to fetch translations');
        } finally {
            setLoadingTranslations(false);
        }
    };

    const handleSelectTranslation = (locale: string, entry: any) => {
        if (entry && entry.id) {
            // Navigate to existing translation
            router.visit(route('projects.collections.content.edit', {
                project: project.id,
                collection: collection.id,
                contentEntry: entry.id,
            }));
        } else {
            // Open select modal to choose or create entry
            setSelectedLocaleForTranslation(locale);
            setShowTranslationSelectModal(true);
        }
    };

    const handleLinkTranslation = async (entry: ContentEntry) => {
        if (!contentEntry) return;
        
        try {
            const response = await axios.post(route('projects.collections.content.linkTranslation', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }), {
                translation_entry_id: entry.id,
            });
            
            toast.success('Translation linked successfully');
            setShowTranslationSelectModal(false);
            setSelectedLocaleForTranslation(null);

            const groupId = response.data?.translation_group_id ?? contentEntry.translation_group_id;
            contentEntry.translation_group_id = groupId;

            await fetchTranslationsWithGroupId(groupId);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to link translation');
        }
    };

    const handleUnlinkTranslation = async (locale: string, entry: any) => {
        if (!contentEntry || !entry) return;
        
        try {
            await axios.post(route('projects.collections.content.unlinkTranslation', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }), {
                translation_entry_id: entry.id,
            });
            
            toast.success('Translation unlinked successfully');
            // Refresh translations
            fetchTranslations();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to unlink translation');
        }
    };

    const handleCreateTranslation = async (targetLocale: string) => {
        if (!contentEntry) return;

        try {
            setLoadingTranslations(true);

            const response = await axios.post(route('projects.collections.content.createTranslation', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }), {
                target_locale: targetLocale,
            });

            const newEntryId = response.data.entry_id;

            toast.success('Translation entry created');
            setShowTranslationsDialog(false);

            router.visit(route('projects.collections.content.edit', {
                project: project.id,
                collection: collection.id,
                contentEntry: newEntryId,
            }));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create translation entry');
        } finally {
            setLoadingTranslations(false);
        }
    };

    const handleAiTranslate = async (targetLocale: string) => {
        if (!contentEntry) return;

        setShowAiTranslateConfirm(null);
        setAiTranslatingLocale(targetLocale);
        setAiTranslateProgress('Starting translation...');

        const xsrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];

        try {
            const response = await fetch(route('projects.collections.content.translateWithAi', {
                project: project.id,
                collection: collection.id,
                contentEntry: contentEntry.id,
            }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream',
                    'X-XSRF-TOKEN': xsrfToken ? decodeURIComponent(xsrfToken) : '',
                },
                body: JSON.stringify({ target_locale: targetLocale }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Request failed with status ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            const decoder = new TextDecoder();
            let buffer = '';
            let newEntryId: number | null = null;
            let usageData: { prompt_tokens: number; completion_tokens: number } | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'progress') {
                            setAiTranslateProgress(data.message || `Translating field ${data.index} of ${data.total}...`);
                        } else if (data.type === 'warning') {
                            console.warn('AI translate warning:', data.message);
                        } else if (data.type === 'done') {
                            newEntryId = data.entry_id;
                            if (data.usage) {
                                usageData = {
                                    prompt_tokens: data.usage.prompt_tokens || 0,
                                    completion_tokens: data.usage.completion_tokens || 0,
                                };
                                aiUsage.reportUsage({
                                    action: 'translate',
                                    usage: usageData,
                                });
                            }
                        } else if (data.type === 'error') {
                            throw new Error(data.message);
                        }
                    } catch (parseError: any) {
                        if (parseError.message && !parseError.message.includes('JSON')) {
                            throw parseError;
                        }
                    }
                }
            }

            if (newEntryId) {
                setShowTranslationsDialog(false);
                setAiTranslateResult({
                    entryId: newEntryId,
                    locale: targetLocale,
                    usage: usageData || undefined,
                });
            } else {
                toast.error('Translation completed but no entry was created');
                await fetchTranslations();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to translate with AI');
        } finally {
            setAiTranslatingLocale(null);
            setAiTranslateProgress('');
        }
    };

    const handleFieldChange = (field: Field, value: any, index?: number) => {
        const newData = { ...formData };

        if (field.type === 'group') {
            // Field groups handle their own value structure
            newData[field.name] = value;
        } else if (field.options?.repeatable) {
            if (typeof index === 'number') {
                // We're updating a specific item in the repeatable field
                if (!Array.isArray(newData[field.name])) {
                    newData[field.name] = [{ value: null }];
                }
                newData[field.name][index].value = value;
            } else {
                // We're replacing the entire array (used when adding or removing items)
                newData[field.name] = value;
            }
        } else if (field.type === 'media') {
            // For media fields, ensure we're storing an array of IDs
            newData[field.name] = Array.isArray(value) ? value : (value ? [value] : []);
        } else {
            newData[field.name] = value;
        }

        // If this field is referenced by a slug field, update the slug
        const slugField = organizedFields.find(f =>
            f.type === 'slug' &&
            f.options?.slug?.field === field.name
        );
        if (slugField && !field.options?.repeatable && field.type !== 'group') {
            newData[slugField.name] = slugify(value);
        }

        setFormData(newData);

        if (userHasInteractedRef.current) {
            setHasUnsavedChanges(true);
        }
    };

    // Format a date for full timestamp display
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return formatLocalDateTime(dateString);
    };

    const formatRelativeDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return formatRelativeFromNow(dateString);
    };

    // Provide form field data for AI context (field-to-field awareness)
    const getFieldsSummary = React.useCallback((): FieldSummary[] => {
        return collection.fields
            .filter(f => !f.parent_field_id && ['text', 'longtext', 'richtext', 'number', 'enumeration', 'boolean', 'date', 'slug'].includes(f.type))
            .map(f => {
                let val = formData[f.name];
                // For rich text, use html content if available
                if (f.type === 'richtext' && val && typeof val === 'object' && 'html' in val) {
                    val = (val as any).html || '';
                    // Strip HTML tags for context
                    val = val.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                }
                // Truncate long values
                if (typeof val === 'string' && val.length > 300) {
                    val = val.slice(0, 300) + '...';
                }
                return { name: f.name, label: f.label, type: f.type, value: val ?? '' };
            })
            .filter(f => f.value !== '' && f.value !== null && f.value !== undefined);
    }, [collection.fields, formData]);

    // ── Save action buttons ───────────────────────────────────────────
    const renderSaveActions = (compact = false) => (
        <>
            {!is_singleton && (
                <div className={compact ? 'flex flex-wrap items-center gap-2' : 'flex flex-col space-y-3'}>
                    {isEditMode && can.update_content && (
                        <div className="flex space-x-2">
                            <Button 
                                onClick={() => handleSubmit('stay', 'draft')}
                                disabled={processing}
                                variant="secondary"
                                className={compact ? '' : 'flex-grow'}
                            >
                                Save as draft
                            </Button>
                        </div>
                    )}
                    {!isEditMode && (
                        <div className="flex space-x-2">
                            <Button 
                                onClick={() => handleSubmit('stay', 'draft')}
                                disabled={processing}
                                variant="secondary"
                                className={compact ? '' : 'flex-grow'}
                            >
                                Save as draft
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="px-2">
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSubmit('close', 'draft')}>
                                        Save and close
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSubmit('new', 'draft')}>
                                        Save and create new
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    
                    {isEditMode && can.publish_content && (
                        <div className="flex space-x-2">
                            <Button 
                                onClick={() => handleSubmit('stay', 'published')}
                                disabled={processing}
                                className={compact ? '' : 'flex-grow'}
                            >
                                Save & Publish
                            </Button>
                        </div>
                    )}
                    
                    {!isEditMode && can.publish_content && (
                        <div className="flex space-x-2">
                            <Button 
                                onClick={() => handleSubmit('stay', 'published')}
                                disabled={processing}
                                className={compact ? '' : 'flex-grow'}
                            >
                                Save & Publish
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="px-2">
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSubmit('close', 'published')}>
                                        Save, publish and close
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSubmit('new', 'published')}>
                                        Save, publish and create new
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            )}

            {is_singleton && (
                <div className={compact ? 'flex flex-wrap items-center gap-2' : 'flex flex-col space-y-3'}>
                    {isEditMode && can.update_content && (
                        <Button
                            onClick={() => handleSubmit('stay', 'draft')}
                            disabled={processing}
                            variant="secondary"
                            className={compact ? '' : 'w-full'}
                        >
                            Save as draft
                        </Button>
                    )}
                    {((!isEditMode) || can.publish_content) && (
                        <Button 
                            onClick={() => handleSubmit('stay', 'published')}
                            disabled={processing}
                            className={compact ? '' : 'w-full'}
                        >
                            {isEditMode ? 'Save & Publish' : 'Save Content'}
                        </Button>
                    )}
                </div>
            )}
        </>
    );

    // ── Sidebar extras (state, actions, locale, details) ────────────
    const renderSidebarExtras = () => (
        <>
            {!is_singleton && (
                <>
                    {isEditMode && contentEntry && (
                        <div className={`p-3 rounded-md flex items-center justify-between ${
                            contentState === 'published' 
                                ? 'border border-primary/25 bg-primary/10'
                                : 'border border-border bg-muted/50'
                        }`}>
                            <div className="flex items-center space-x-2">
                                {contentState === 'published' ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                    <h3 className={`font-medium ${
                                        contentState === 'published' 
                                            ? 'text-primary'
                                            : 'text-foreground'
                                    }`}>
                                        {contentState === 'published' ? 'Published' : 'Draft'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {contentState === 'published'
                                            ? (contentEntry.is_draft_dirty
                                                ? 'Unpublished changes in this draft. Live API still serves the last published version.'
                                                : `Published on ${formatLocalDate(contentEntry.published_at)}`)
                                            : 'This entry is not yet published'}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className={
                                contentState === 'published' 
                                    ? 'border-primary/30 bg-primary/15 text-primary hover:bg-primary/20'
                                    : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
                            }>
                                {contentState === 'published'
                                    ? (contentEntry.is_draft_dirty ? 'Draft dirty' : 'Live')
                                    : 'Draft'}
                            </Badge>
                        </div>
                    )}

                    {isEditMode && contentEntry && contentState === 'published' && can.unpublish_content && (
                        <Button 
                            onClick={() => setShowUnpublishDialog(true)}
                            disabled={processing}
                            variant="outline"
                            className="w-full"
                        >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Unpublish
                        </Button>
                    )}

                    {isEditMode && contentEntry && (
                        <VersionHistory
                            projectId={project.id}
                            collectionId={collection.id}
                            contentEntryId={contentEntry.id}
                            publishedVersionNumber={contentEntry.published_version_number ?? null}
                            isDraftDirty={!!contentEntry.is_draft_dirty}
                            canRevert={!!can.publish_content}
                            fields={collection.fields}
                        />
                    )}
                    
                    {isEditMode && contentEntry && (can.create_content || can.move_content_to_trash || can.delete_content) && (
                        <>
                            <div className="flex space-x-2">
                                {can.move_content_to_trash && (
                                    <Button
                                        onClick={() => setShowTrashDialog(true)}
                                        variant="outline"
                                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Move to Trash
                                    </Button>
                                )}
                                {can.delete_content && (
                                    <Button
                                        onClick={() => setShowDeleteDialog(true)}
                                        variant="outline"
                                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                {can.create_content && (
                                    <Button
                                        onClick={() => setShowDuplicateDialog(true)}
                                        variant="outline"
                                        className="flex-1"
                                        disabled={processing}
                                    >
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {is_singleton && (
                <>
                    {isEditMode && contentEntry && (
                        <div className={`p-3 rounded-md flex items-center justify-between ${
                            contentState === 'published'
                                ? 'border border-primary/25 bg-primary/10'
                                : 'border border-border bg-muted/50'
                        }`}>
                            <div className="flex items-center space-x-2">
                                {contentState === 'published' ? (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div>
                                    <h3 className={`font-medium ${
                                        contentState === 'published'
                                            ? 'text-primary'
                                            : 'text-foreground'
                                    }`}>
                                        {contentState === 'published' ? 'Published' : 'Draft'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {contentState === 'published'
                                            ? (contentEntry.is_draft_dirty
                                                ? 'Unpublished changes in this draft. Live API still serves the last published version.'
                                                : `Published on ${formatLocalDate(contentEntry.published_at)}`)
                                            : 'This entry is not yet published'}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline" className={
                                contentState === 'published'
                                    ? 'border-primary/30 bg-primary/15 text-primary hover:bg-primary/20'
                                    : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
                            }>
                                {contentState === 'published'
                                    ? (contentEntry.is_draft_dirty ? 'Draft dirty' : 'Live')
                                    : 'Draft'}
                            </Badge>
                        </div>
                    )}

                    {isEditMode && contentEntry && contentState === 'published' && can.unpublish_content && (
                        <Button
                            onClick={() => setShowUnpublishDialog(true)}
                            disabled={processing}
                            variant="outline"
                            className="w-full"
                        >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Unpublish
                        </Button>
                    )}

                    {isEditMode && contentEntry && (
                        <VersionHistory
                            projectId={project.id}
                            collectionId={collection.id}
                            contentEntryId={contentEntry.id}
                            publishedVersionNumber={contentEntry.published_version_number ?? null}
                            isDraftDirty={!!contentEntry.is_draft_dirty}
                            canRevert={!!can.publish_content}
                            fields={collection.fields}
                        />
                    )}

                    <div className="text-xs text-muted-foreground">
                        This is a single entry collection. Only one content entry is allowed.
                    </div>
                </>
            )}

            {aiEnabled && <AiUsageFooter />}

            {/* Locale selector */}
            <Card className="border-border/70 bg-muted/30 py-2">
                <CardContent className="py-3">
                    <div className="space-y-2">
                        <h3 className="flex items-center space-x-2 text-xs font-medium">
                            <Globe2 className="w-4 h-4 text-muted-foreground" />
                            <span>Locale</span>
                        </h3>
                        <Select
                            isMulti={false}
                            value={{ value: locale, label: locale.toUpperCase() }}
                            onChange={(option: any) => {
                                const nextLocale = option?.value || project.default_locale;
                                if (nextLocale === locale) {
                                    return;
                                }

                                setLocale(nextLocale);

                                if (userHasInteractedRef.current) {
                                    setHasUnsavedChanges(true);
                                }
                            }}
                            options={availableLocales.map(l => ({ value: l, label: l.toUpperCase() }))}
                            isDisabled={processing}
                        />
                    </div>
                </CardContent>
            </Card>

            {isEditMode && availableLocales.length > 1 && (
                <Button
                    variant="outline"
                    className="w-full"
                    disabled={processing}
                    onClick={() => {
                        setShowTranslationsDialog(true);
                        fetchTranslations();
                    }}
                >
                    <Languages className="mr-2 h-4 w-4" />
                    Translations
                </Button>
            )}

            {isEditMode && contentEntry && (
                <Card className="border-border/70 bg-muted/30 py-2">
                    <CardContent className="py-3">
                        <h3 className="mb-3 text-xs font-medium">Content Details</h3>
                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">ID:</span>
                                </div>
                                <span className="font-medium">{contentEntry.id}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Key className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">UUID:</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <span className="font-medium">
                                        {contentEntry.uuid ? `${contentEntry.uuid.substring(0, 8)}...` : 'N/A'}
                                    </span>
                                    {contentEntry.uuid && (
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6"
                                            onClick={() => {
                                                navigator.clipboard.writeText(contentEntry.uuid);
                                                toast.success('UUID copied to clipboard');
                                            }}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Created:</span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="font-medium cursor-help">{formatRelativeDate(contentEntry.created_at)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{formatDate(contentEntry.created_at)}</TooltipContent>
                                </Tooltip>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">By:</span>
                                </div>
                                <span className="font-medium">{contentEntry.creator?.name || 'API'}</span>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Updated:</span>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="font-medium cursor-help">{formatRelativeDate(contentEntry.updated_at)}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{formatDate(contentEntry.updated_at)}</TooltipContent>
                                </Tooltip>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">By:</span>
                                </div>
                                <span className="font-medium">{contentEntry.updater?.name || 'API'}</span>
                            </div>
                            
                            <Separator />
                            
                            {contentState === 'published' && contentEntry.published_at && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Published:</span>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="font-medium cursor-help">{formatRelativeDate(contentEntry.published_at)}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>{formatDate(contentEntry.published_at)}</TooltipContent>
                                    </Tooltip>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Globe2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Locale:</span>
                                </div>
                                <Badge variant="outline" className="uppercase">
                                    {contentEntry.locale || 'en'}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );

    return (
        <ContentAiUsageProvider>
        <ContentAiFormProvider getFieldsSummary={getFieldsSummary} collectionName={collection.name}>
        <div
            onPointerDownCapture={markUserInteraction}
            onKeyDownCapture={(event) => {
                if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
                    return;
                }

                markUserInteraction();
            }}
        >
            <div className="space-y-6">
                {/* Compact action bar – visible below 1440px */}
                <div className="flex justify-end items-center gap-2 @min-[900px]:hidden">
                    {renderSaveActions(true)}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowSidebarSheet(true)}
                        className="shrink-0"
                        title="Content options"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>

                {/* Main content area */}
                <div className="@min-[900px]:flex @min-[900px]:justify-between @min-[900px]:space-x-4">
                    <div className="space-y-4 w-full @min-[900px]:w-3/4 min-w-0">
                        {is_singleton && (
                            <div className="mb-3">
                                <h1 className="text-xl font-bold">{collection.name}
                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                        #
                                        <span className="select-all">{collection.slug}</span>
                                    </span>
                                </h1>
                            </div>
                        )}
                        {organizedFields.map(field => (
                            <div className="w-full rounded-md border border-dashed border-border/70 p-4" key={field.id}>
                                <React.Fragment>
                                    {renderField({
                                        field,
                                        value: formData[field.name],
                                        onChange: handleFieldChange,
                                        processing,
                                        errors,
                                        projectId: project.id,
                                        locales: availableLocales,
                                        collectionName: collection.name,
                                    })}
                                </React.Fragment>
                            </div>
                        ))}
                    </div>

                    {/* Full sidebar – visible at 1440px+ */}
                    <div className="hidden @min-[900px]:block @min-[900px]:w-1/4 @min-[900px]:flex-1">
                        <aside className="sticky top-4 space-y-4 [&_button]:text-sm">
                            {renderSaveActions()}
                            {renderSidebarExtras()}
                        </aside>
                    </div>
                </div>
            </div>

            {/* Sidebar sheet for small screens */}
            <Sheet open={showSidebarSheet} onOpenChange={setShowSidebarSheet}>
                <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Content Options</SheetTitle>
                        <SheetDescription>State, actions, and metadata</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 px-4 pb-6 [&_button]:text-xs">
                        {renderSidebarExtras()}
                    </div>
                </SheetContent>
            </Sheet>

            <UnsavedChangesDialog
                open={showLeaveConfirm}
                onConfirm={confirmLeave}
                onCancel={cancelLeave}
            />

            {/* Unpublish Confirmation Dialog */}
            <Dialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unpublish Content</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to unpublish this content? It will no longer be visible to users.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUnpublishDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="default" 
                            onClick={handleUnpublish} 
                            disabled={processing}
                        >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Unpublish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Move to Trash Confirmation Dialog */}
            <Dialog open={showTrashDialog} onOpenChange={setShowTrashDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Move to Trash</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to move this content to trash? You can restore it later.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTrashDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleMoveToTrash} 
                            disabled={processing}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Move to Trash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Content Permanently</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete this content? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete} 
                            disabled={processing}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Duplicate Confirmation Dialog */}
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Duplicate Content</DialogTitle>
                        <DialogDescription>
                            This will create a new draft copy of the current entry. Continue?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDuplicateDialog(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleDuplicate} disabled={processing}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Translations Dialog */}
            <Dialog
                open={showTranslationsDialog}
                onOpenChange={(open) => {
                    if (!open && isAiTranslationRunning) {
                        return;
                    }
                    setShowTranslationsDialog(open);
                }}
            >
                <DialogContent
                    className="sm:max-w-xl border-border bg-background text-foreground"
                    onEscapeKeyDown={(event) => {
                        if (isAiTranslationRunning) {
                            event.preventDefault();
                        }
                    }}
                    onPointerDownOutside={(event) => {
                        if (isAiTranslationRunning) {
                            event.preventDefault();
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Translations</DialogTitle>
                        <DialogDescription>
                            Manage translations for this content entry across different locales.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        {loadingTranslations ? (
                            <div className="py-4 text-center text-muted-foreground">
                                Loading translations...
                            </div>
                        ) : (
                            availableLocales.map((loc) => {
                                const translation = translations[loc];
                                const isCurrent = contentEntry && contentEntry.locale === loc;
                                
                                return (
                                    <div
                                        key={loc}
                                        className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-3 transition-colors hover:bg-accent/20"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Badge variant="outline" className="border-border bg-muted uppercase text-foreground">
                                                {loc}
                                            </Badge>
                                            {isCurrent && (
                                                <Badge variant="outline" className="border-primary/30 bg-primary/15 text-xs text-primary">
                                                    Current
                                                </Badge>
                                            )}
                                            {translation && !isCurrent && (
                                                <button
                                                    onClick={() => {
                                                        router.visit(route('projects.collections.content.edit', {
                                                            project: project.id,
                                                            collection: collection.id,
                                                            contentEntry: translation.id,
                                                        }));
                                                    }}
                                                    className="cursor-pointer text-sm text-primary hover:text-primary/80 hover:underline"
                                                >
                                                    Entry #{translation.id}
                                                </button>
                                            )}
                                            {!translation && !isCurrent && aiTranslatingLocale !== loc && (
                                                <span className="text-sm text-muted-foreground">
                                                    No translation
                                                </span>
                                            )}
                                            {aiTranslatingLocale === loc && (
                                                <span className="animate-pulse text-xs text-primary/80">
                                                    {aiTranslateProgress}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {translation && !isCurrent && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUnlinkTranslation(loc, translation)}
                                                    disabled={loadingTranslations || !!aiTranslatingLocale}
                                                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    Unlink
                                                </Button>
                                            )}
                                            {!translation && !isCurrent && (
                                                <>
                                                    {aiEnabled && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => aiTranslatingLocale === loc ? null : setShowAiTranslateConfirm(loc)}
                                                            disabled={loadingTranslations || !!aiTranslatingLocale}
                                                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                                                        >
                                                            {aiTranslatingLocale === loc ? (
                                                                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Translating...</>
                                                            ) : (
                                                                <><Sparkles className="h-3.5 w-3.5 mr-1" /> Translate with AI</>
                                                            )}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleCreateTranslation(loc)}
                                                        disabled={loadingTranslations || !!aiTranslatingLocale}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                                        Create
                                                    </Button>
                                                    {!is_singleton && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                handleSelectTranslation(loc, translation);
                                                            }}
                                                            disabled={loadingTranslations || !!aiTranslatingLocale}
                                                        >
                                                            Select
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowTranslationsDialog(false)}
                            disabled={isAiTranslationRunning}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Translate Confirmation Dialog */}
            <Dialog open={!!showAiTranslateConfirm} onOpenChange={(open) => !open && setShowAiTranslateConfirm(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Translate with AI</DialogTitle>
                        <DialogDescription>
                            This will create a new draft entry in <span className="font-medium uppercase">{showAiTranslateConfirm}</span> locale by translating all text fields using AI. Non-text fields will be copied as-is.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAiTranslateConfirm(null)}>
                            Cancel
                        </Button>
                        <Button onClick={() => showAiTranslateConfirm && handleAiTranslate(showAiTranslateConfirm)}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Translate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AI Translation Result Dialog */}
            <Dialog open={!!aiTranslateResult} onOpenChange={(open) => !open && setAiTranslateResult(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Translation Complete
                        </DialogTitle>
                        <DialogDescription>
                            A new draft entry has been created in <span className="font-medium uppercase">{aiTranslateResult?.locale}</span> locale.
                        </DialogDescription>
                    </DialogHeader>
                    {aiTranslateResult?.usage && (
                        <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-3 py-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                <Sparkles className="h-3 w-3" />
                                <span className="font-medium">Token usage</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5 pl-[18px]">
                                <div>
                                    <span className="text-foreground/70 font-medium">
                                        {(aiTranslateResult.usage.prompt_tokens + aiTranslateResult.usage.completion_tokens).toLocaleString()}
                                    </span> total tokens
                                </div>
                                <div className="text-muted-foreground/60">
                                    ↑{aiTranslateResult.usage.prompt_tokens.toLocaleString()} prompt · ↓{aiTranslateResult.usage.completion_tokens.toLocaleString()} completion
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAiTranslateResult(null)}>
                            Stay Here
                        </Button>
                        <Button onClick={() => {
                            if (aiTranslateResult) {
                                router.visit(route('projects.collections.content.edit', {
                                    project: project.id,
                                    collection: collection.id,
                                    contentEntry: aiTranslateResult.entryId,
                                }));
                            }
                        }}>
                            Open Translated Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Translation Select Modal */}
            {selectedLocaleForTranslation && (
                <TranslationSelectModal
                    isOpen={showTranslationSelectModal}
                    onClose={() => {
                        setShowTranslationSelectModal(false);
                        setSelectedLocaleForTranslation(null);
                    }}
                    collection={collection}
                    projectId={project.id}
                    locale={selectedLocaleForTranslation}
                    excludeEntryIds={[
                        contentEntry?.id,
                        ...Object.values(translations)
                            .filter((t: any) => t && t.id)
                            .map((t: any) => t.id)
                    ].filter(Boolean) as number[]}
                    onSelect={handleLinkTranslation}
                />
            )}
        </div>
        </ContentAiFormProvider>
        </ContentAiUsageProvider>
    );
}

function AiUsageFooter() {
    const { totalTokens, totalPromptTokens, totalCompletionTokens, requestCount } = useContentAiUsage();

    if (requestCount === 0) return null;

    return (
        <div className="rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Sparkles className="h-3 w-3" />
                <span className="font-medium">AI usage this session</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5 pl-[18px]">
                <div>{requestCount} {requestCount === 1 ? 'request' : 'requests'}</div>
                <div><span className="text-foreground/70 font-medium">{totalTokens.toLocaleString()}</span> tokens <span className="text-muted-foreground/60">(↑{totalPromptTokens.toLocaleString()} ↓{totalCompletionTokens.toLocaleString()})</span></div>
            </div>
        </div>
    );
}