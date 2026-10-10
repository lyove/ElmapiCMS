import { slugify } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Collection } from '@/types/index.d';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import MultiSelect from '@/components/ui/select/Select';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
    collection?: Collection;
}

interface Template {
    id: number;
    name: string;
    is_singleton?: boolean;
}

type CreateCollectionForm = {
    name: string;
    slug: string;
    template_id: string;
    is_singleton: boolean | null;
    create_type: 'manual' | 'import';
    import_file: File | null;
};

export default function CreateCollectionModal({ open, onOpenChange, projectId, collection }: Props) {
    const { data, setData, post, put, processing, progress, errors, reset, clearErrors } = useForm<CreateCollectionForm>({
        name: collection?.name ?? '',
        slug: collection?.slug ?? '',
        template_id: '',
        is_singleton: false,
        create_type: 'manual',
        import_file: null,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [templates, setTemplates] = useState<Template[]>([]);

    useEffect(() => {
        if (!collection && open) {
            axios
                .get(route('collection-templates.index'))
                .then((res) => setTemplates(res.data))
                .catch(() => setTemplates([]));
        }
    }, [open, collection]);

    // Generate slug from name
    useEffect(() => {
        if (data.name) {
            const generatedSlug = slugify(data.name);
            setData('slug', generatedSlug);
        }
    }, [data.name]);

    // Reset form when modal opens/closes or collection changes
    useEffect(() => {
        if (open) {
            setData({
                name: collection?.name ?? '',
                slug: collection?.slug ?? '',
                template_id: '',
                is_singleton: false as boolean,
                create_type: 'manual',
                import_file: null,
            });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } else {
            reset();
            clearErrors();
        }
    }, [open, collection]);

    // Also clear errors whenever modal is opened fresh
    useEffect(() => {
        if (open) {
            clearErrors();
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (collection) {
            // Update existing collection
            put(route('projects.collections.update', [projectId, collection.id]), {
                onSuccess: () => {
                    reset();
                    onOpenChange(false);
                },
            });
        } else {
            // Import from file if selected
            if (data.create_type === 'import' && data.import_file) {
                post(route('projects.collections.import', projectId), {
                    forceFormData: true,
                    onSuccess: () => {
                        reset();
                        onOpenChange(false);
                    },
                    onError: (errors) => {
                        console.error('Import error:', errors);
                    },
                });
            } else {
                // Create new collection manually
                post(route('projects.collections.store', projectId), {
                    onSuccess: () => {
                        reset();
                        onOpenChange(false);
                    },
                });
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle>{collection ? 'Edit Collection' : 'Create New Collection'}</DialogTitle>
                    <DialogDescription className="sr-only">Fill in the details below to create a new collection.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!collection && data.create_type === 'import' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="import_file">Import File (JSON or ZIP)</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        ref={fileInputRef}
                                        id="import_file"
                                        type="file"
                                        accept=".json,.zip,application/json,application/zip"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setData('import_file', file);
                                                if (file.name.toLowerCase().endsWith('.json')) {
                                                    try {
                                                        const text = await file.text();
                                                        const jsonData = JSON.parse(text);
                                                        if (jsonData.name) {
                                                            setData('name', jsonData.name);
                                                        }
                                                        if (jsonData.slug) {
                                                            setData('slug', jsonData.slug);
                                                        }
                                                        if (jsonData.is_singleton !== undefined) {
                                                            setData('is_singleton', jsonData.is_singleton);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error reading file:', error);
                                                    }
                                                }
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full sm:w-auto"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {data.import_file ? data.import_file.name : 'Choose File'}
                                    </Button>
                                </div>
                                {data.import_file && <p className="text-muted-foreground text-sm">Selected: {data.import_file.name}</p>}
                                <InputError message={errors.import_file} />
                                {progress && (
                                    <div className="space-y-2" aria-live="polite">
                                        <div className="text-muted-foreground flex justify-between text-sm">
                                            <span>Uploading package</span>
                                            <span>{progress.percentage}%</span>
                                        </div>
                                        <Progress value={progress.percentage} />
                                    </div>
                                )}
                            </div>

                            {data.import_file && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Collection Name Override</Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="Use the package name"
                                            autoFocus
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="slug">Slug Override</Label>
                                        <Input
                                            id="slug"
                                            value={data.slug}
                                            onChange={(e) => setData('slug', e.target.value)}
                                            placeholder="Use the package slug"
                                        />
                                        <InputError message={errors.slug} />
                                    </div>

                                    <div className="flex items-start space-x-2 rounded-md border border-dashed border-gray-600 p-4 dark:border-gray-400">
                                        <Checkbox
                                            id="is_singleton"
                                            checked={!!data.is_singleton}
                                            onCheckedChange={(checked) => setData('is_singleton', checked === true)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="is_singleton">Single record collection</Label>
                                            <p className="text-muted-foreground text-sm">
                                                A single record collection is a collection that can only have one record.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {(collection || (!collection && data.create_type === 'manual')) && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="name">Collection Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    placeholder="Enter collection name"
                                    autoFocus={!collection}
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    required
                                    placeholder="Enter collection slug"
                                />
                                <InputError message={errors.slug} />
                            </div>

                            {!collection && (
                                <div className="space-y-2">
                                    <Label htmlFor="template">Template</Label>
                                    <MultiSelect
                                        instanceId="template-select"
                                        options={templates.map((t) => ({ value: t.id.toString(), label: t.name }))}
                                        isClearable
                                        isSearchable
                                        placeholder="Select a template (optional)"
                                        value={
                                            templates
                                                .map((t) => ({ value: t.id.toString(), label: t.name }))
                                                .find((o) => o.value === data.template_id) || null
                                        }
                                        onChange={(newValue: unknown) => {
                                            const selected = newValue as { value: string; label: string } | null;
                                            const tplId = selected ? selected.value : '';
                                            setData('template_id', tplId);
                                            if (tplId) {
                                                const tpl = templates.find((t) => t.id.toString() === tplId);
                                                if (tpl) {
                                                    setData('is_singleton', !!tpl.is_singleton);
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Singleton toggle (only when creating) */}
                            {!collection && (
                                <div className="flex items-start space-x-2 rounded-md border border-dashed border-gray-600 p-4 dark:border-gray-400">
                                    <Checkbox
                                        id="is_singleton"
                                        checked={!!data.is_singleton}
                                        disabled={!!data.template_id}
                                        onCheckedChange={(checked) => setData('is_singleton', checked === true)}
                                        className="mt-1"
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="is_singleton">Single record collection</Label>
                                        <p className="text-muted-foreground text-sm">
                                            A single record collection is a collection that can only have one record.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {!collection && (
                        <div className="space-y-2">
                            <Label htmlFor="create_type">Create Type</Label>
                            <RadioGroup
                                value={data.create_type}
                                onValueChange={(value) => {
                                    setData('create_type', value as 'manual' | 'import');
                                    if (value === 'manual') {
                                        setData('import_file', null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    } else {
                                        setData('name', '');
                                        setData('slug', '');
                                        setData('template_id', '');
                                        setData('is_singleton', null);
                                    }
                                }}
                                className="grid gap-2"
                            >
                                <div className="flex items-start space-x-2 rounded-md border border-dashed border-gray-600 p-4 dark:border-gray-400">
                                    <RadioGroupItem value="manual" id="type_manual" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_manual" className="font-medium">
                                            Create Manually
                                        </Label>
                                        <p className="text-muted-foreground text-sm">Create a new collection from scratch.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-2 rounded-md border border-dashed border-gray-600 p-4 dark:border-gray-400">
                                    <RadioGroupItem value="import" id="type_import" className="mt-1" />
                                    <div className="space-y-1">
                                        <Label htmlFor="type_import" className="font-medium">
                                            Import from File
                                        </Label>
                                        <p className="text-muted-foreground text-sm">Import a JSON or ZIP collection package.</p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    <DialogFooter className="border-t pt-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {collection ? 'Update Collection' : data.create_type === 'import' ? 'Import Collection' : 'Create Collection'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
