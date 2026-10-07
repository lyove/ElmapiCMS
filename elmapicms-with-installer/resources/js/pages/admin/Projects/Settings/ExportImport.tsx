import { Head, useForm } from '@inertiajs/react';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { ChevronDown, Download, FileArchive, FileJson, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { BreadcrumbItem, Collection, Project } from '@/admin/types/index.d';

import HeadingSmall from '@/admin/components/heading-small';
import InputError from '@/admin/components/input-error';
import { Button } from '@/admin/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/admin/components/ui/card';
import { Checkbox } from '@/admin/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/admin/components/ui/collapsible';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Progress } from '@/admin/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/admin/components/ui/radio-group';
import AppLayout from '@/admin/layouts/app-layout';
import { slugify } from '@/admin/lib/utils';
import ProjectSettingsLayout from './layout';

type AssetScope = 'referenced' | 'all';

type ImportCollectionForm = {
    import_file: File | null;
    name: string;
    slug: string;
    is_singleton: boolean | null;
};

interface Props {
    project: Project & {
        collections: Collection[];
    };
}

function filenameFromDisposition(disposition?: string): string | null {
    if (!disposition) {
        return null;
    }

    const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

    if (encodedFilename) {
        try {
            return decodeURIComponent(encodedFilename.replace(/^["']|["']$/g, ''));
        } catch {
            return encodedFilename;
        }
    }

    return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
}

function downloadExport(response: AxiosResponse<Blob>, fallbackName: string): void {
    const contentType = response.headers['content-type'] || response.data.type || 'application/json';
    const blob = new Blob([response.data], { type: contentType });
    const filename = filenameFromDisposition(response.headers['content-disposition']);
    const extension = contentType.includes('zip') ? 'zip' : 'json';
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename ?? `${fallbackName}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
}

interface AssetExportControlsProps {
    idPrefix: string;
    includeAssets: boolean;
    includeContent: boolean;
    scope: AssetScope;
    onIncludeAssetsChange: (includeAssets: boolean) => void;
    onScopeChange: (scope: AssetScope) => void;
}

function AssetExportControls({ idPrefix, includeAssets, includeContent, scope, onIncludeAssetsChange, onScopeChange }: AssetExportControlsProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-start gap-2">
                <Checkbox
                    id={`${idPrefix}_include_assets`}
                    checked={includeAssets}
                    onCheckedChange={(checked) => onIncludeAssetsChange(checked === true)}
                    className="mt-1"
                />
                <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}_include_assets`} className="font-medium">
                        Include assets
                    </Label>
                    <p className="text-muted-foreground text-sm">Package asset files with this export.</p>
                </div>
            </div>

            {includeAssets && (
                <div className="space-y-2 pl-6">
                    <Label>Asset scope</Label>
                    <RadioGroup value={scope} onValueChange={(value) => onScopeChange(value as AssetScope)}>
                        <div className="flex items-start gap-2">
                            <RadioGroupItem value="referenced" id={`${idPrefix}_assets_referenced`} disabled={!includeContent} className="mt-1" />
                            <div>
                                <Label htmlFor={`${idPrefix}_assets_referenced`}>Referenced assets</Label>
                                <p className="text-muted-foreground text-xs">Only assets referenced by included content.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <RadioGroupItem value="all" id={`${idPrefix}_assets_all`} className="mt-1" />
                            <div>
                                <Label htmlFor={`${idPrefix}_assets_all`}>All assets</Label>
                                <p className="text-muted-foreground text-xs">The entire project Asset Library.</p>
                            </div>
                        </div>
                    </RadioGroup>
                    {!includeContent && <p className="text-muted-foreground text-xs">Include content to limit the package to referenced assets.</p>}
                </div>
            )}
        </div>
    );
}

export default function ExportImportPage({ project }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', project.id),
        },
        {
            title: 'Settings',
            href: route('projects.settings.project', project.id),
        },
        {
            title: 'Export/Import',
            href: route('projects.settings.export-import', project.id),
        },
    ];

    const [exporting, setExporting] = useState(false);
    const [includeCollections, setIncludeCollections] = useState(true);
    const [includeContent, setIncludeContent] = useState(false);
    const [includeAssets, setIncludeAssets] = useState(false);
    const [assetScope, setAssetScope] = useState<AssetScope>('referenced');
    const [exportingCollection, setExportingCollection] = useState<number | null>(null);
    const [includeCollectionContent, setIncludeCollectionContent] = useState<Record<number, boolean>>({});
    const [includeCollectionAssets, setIncludeCollectionAssets] = useState<Record<number, boolean>>({});
    const [collectionAssetScopes, setCollectionAssetScopes] = useState<Record<number, AssetScope>>({});
    const importFileInputRef = useRef<HTMLInputElement>(null);
    const importForm = useForm<ImportCollectionForm>({
        import_file: null,
        name: '',
        slug: '',
        is_singleton: null,
    });

    const handleExportProject = async () => {
        setExporting(true);
        try {
            const response = await axios.post(
                route('projects.settings.export-import.export-project', project.id),
                {
                    include_collections: includeCollections,
                    include_content: includeContent,
                    asset_scope: includeAssets ? assetScope : 'none',
                },
                {
                    responseType: 'blob',
                },
            );

            const safeName =
                project.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '') || `project-${project.id}`;
            downloadExport(response, `project_${safeName}_${new Date().toISOString().split('T')[0]}`);

            toast.success('Project exported successfully');
        } catch (error) {
            toast.error('Failed to export project');
            console.error(error);
        } finally {
            setExporting(false);
        }
    };

    const handleExportCollection = async (collection: Collection) => {
        setExportingCollection(collection.id);
        try {
            const response = await axios.post(
                route('projects.settings.export-import.export-collection', {
                    project: project.id,
                    collection: collection.id,
                }),
                {
                    include_content: includeCollectionContent[collection.id] ?? false,
                    asset_scope: includeCollectionAssets[collection.id] ? (collectionAssetScopes[collection.id] ?? 'referenced') : 'none',
                },
                {
                    responseType: 'blob',
                },
            );

            downloadExport(response, `collection_${collection.slug}_${new Date().toISOString().split('T')[0]}`);

            toast.success(`Collection "${collection.name}" exported successfully`);
        } catch (error) {
            toast.error('Failed to export collection');
            console.error(error);
        } finally {
            setExportingCollection(null);
        }
    };

    const handleImportFileChange = async (file: File | null) => {
        importForm.setData('import_file', file);
        importForm.clearErrors('import_file');

        if (!file || !file.name.toLowerCase().endsWith('.json')) {
            return;
        }

        try {
            const parsed = JSON.parse(await file.text()) as {
                collection?: { name?: string; slug?: string; is_singleton?: boolean };
                name?: string;
                slug?: string;
                is_singleton?: boolean;
            };
            const collection = parsed.collection ?? parsed;

            if (collection.name) {
                importForm.setData('name', collection.name);
                importForm.setData('slug', collection.slug || slugify(collection.name));
            } else if (collection.slug) {
                importForm.setData('slug', collection.slug);
            }

            if (typeof collection.is_singleton === 'boolean') {
                importForm.setData('is_singleton', collection.is_singleton);
            }
        } catch {
            toast.error('The selected JSON file could not be read');
        }
    };

    const handleImportCollection = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        importForm.post(route('projects.collections.import', project.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Collection imported successfully');
                importForm.reset();
                if (importFileInputRef.current) {
                    importFileInputRef.current.value = '';
                }
            },
            onError: () => toast.error('Failed to import collection'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Export/Import" />

            <ProjectSettingsLayout project={project}>
                <div className="max-w-4xl space-y-6">
                    <HeadingSmall title="Export/Import" description="Export or import portable JSON and ZIP packages" />

                    <Card>
                        <CardHeader>
                            <CardTitle>Export Project</CardTitle>
                            <CardDescription>Export project structure, content, and assets as a portable JSON or ZIP package.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="include_collections"
                                        checked={includeCollections}
                                        onCheckedChange={(checked) => setIncludeCollections(!!checked)}
                                        className="mt-1"
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="include_collections" className="font-medium">
                                            Include Collections
                                        </Label>
                                        <p className="text-muted-foreground text-sm">Export collection structure and field definitions</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Checkbox
                                        id="include_content"
                                        checked={includeContent}
                                        onCheckedChange={(checked) => {
                                            const isChecked = checked === true;
                                            setIncludeContent(isChecked);
                                            if (!isChecked && assetScope === 'referenced') {
                                                setAssetScope('all');
                                            }
                                        }}
                                        disabled={!includeCollections}
                                        className="mt-1"
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="include_content" className="font-medium">
                                            Include Content
                                        </Label>
                                        <p className="text-muted-foreground text-sm">
                                            Export published content entries (requires collections to be included)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <AssetExportControls
                                idPrefix="project"
                                includeAssets={includeAssets}
                                includeContent={includeContent}
                                scope={assetScope}
                                onIncludeAssetsChange={setIncludeAssets}
                                onScopeChange={setAssetScope}
                            />

                            <Button onClick={handleExportProject} disabled={exporting || !includeCollections} className="w-full sm:w-auto">
                                <Download className="mr-2 h-4 w-4" />
                                {exporting ? 'Exporting...' : 'Export Project'}
                            </Button>
                        </CardContent>
                    </Card>

                    {project.collections && project.collections.length > 0 && (
                        <Collapsible>
                            <Card>
                                <CollapsibleTrigger asChild>
                                    <button type="button" className="group w-full text-left">
                                        <CardHeader className="flex-row items-center justify-between gap-4">
                                            <div className="space-y-1.5">
                                                <CardTitle>Export individual collections</CardTitle>
                                                <CardDescription>
                                                    {project.collections.length} {project.collections.length === 1 ? 'collection' : 'collections'}
                                                </CardDescription>
                                            </div>
                                            <ChevronDown className="text-muted-foreground h-5 w-5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                                        </CardHeader>
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {project.collections.map((collection) => {
                                                const collectionIncludesContent = includeCollectionContent[collection.id] ?? false;
                                                const collectionScope = collectionAssetScopes[collection.id] ?? 'referenced';

                                                return (
                                                    <div key={collection.id} className="flex flex-col gap-4 rounded-md border p-4">
                                                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                                            <div>
                                                                <p className="font-medium">{collection.name}</p>
                                                                <p className="text-muted-foreground text-sm">Slug: {collection.slug}</p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleExportCollection(collection)}
                                                                disabled={exportingCollection === collection.id}
                                                            >
                                                                <Download className="mr-2 h-4 w-4" />
                                                                {exportingCollection === collection.id ? 'Exporting...' : 'Export'}
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <Checkbox
                                                                id={`include_content_${collection.id}`}
                                                                checked={collectionIncludesContent}
                                                                onCheckedChange={(checked) => {
                                                                    const isChecked = checked === true;
                                                                    setIncludeCollectionContent((current) => ({
                                                                        ...current,
                                                                        [collection.id]: isChecked,
                                                                    }));
                                                                    if (!isChecked && collectionScope === 'referenced') {
                                                                        setCollectionAssetScopes((current) => ({
                                                                            ...current,
                                                                            [collection.id]: 'all',
                                                                        }));
                                                                    }
                                                                }}
                                                                className="mt-1"
                                                            />
                                                            <div className="space-y-1">
                                                                <Label htmlFor={`include_content_${collection.id}`} className="text-sm font-medium">
                                                                    Include content
                                                                </Label>
                                                                <p className="text-muted-foreground text-xs">
                                                                    Export published content entries with the collection.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <AssetExportControls
                                                            idPrefix={`collection_${collection.id}`}
                                                            includeAssets={includeCollectionAssets[collection.id] ?? false}
                                                            includeContent={collectionIncludesContent}
                                                            scope={collectionScope}
                                                            onIncludeAssetsChange={(checked) =>
                                                                setIncludeCollectionAssets((current) => ({
                                                                    ...current,
                                                                    [collection.id]: checked,
                                                                }))
                                                            }
                                                            onScopeChange={(scope) =>
                                                                setCollectionAssetScopes((current) => ({
                                                                    ...current,
                                                                    [collection.id]: scope,
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Import collection</CardTitle>
                            <CardDescription>Import collection structure from a portable JSON or ZIP package.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleImportCollection} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="collection_import_file">Import file</Label>
                                    <Input
                                        ref={importFileInputRef}
                                        id="collection_import_file"
                                        type="file"
                                        accept=".json,.zip,application/json,application/zip"
                                        onChange={(event) => void handleImportFileChange(event.target.files?.[0] ?? null)}
                                        required
                                    />
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        {importForm.data.import_file?.name.toLowerCase().endsWith('.zip') ? (
                                            <FileArchive className="h-4 w-4" />
                                        ) : (
                                            <FileJson className="h-4 w-4" />
                                        )}
                                        JSON metadata is used to prefill the fields below. ZIP fields remain editable.
                                    </p>
                                    <InputError message={importForm.errors.import_file} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="collection_import_name">Collection name override</Label>
                                        <Input
                                            id="collection_import_name"
                                            value={importForm.data.name}
                                            onChange={(event) => importForm.setData('name', event.target.value)}
                                            placeholder="Use the package name"
                                        />
                                        <InputError message={importForm.errors.name} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="collection_import_slug">Slug override</Label>
                                        <Input
                                            id="collection_import_slug"
                                            value={importForm.data.slug}
                                            onChange={(event) => importForm.setData('slug', event.target.value)}
                                            placeholder="Use the package slug"
                                        />
                                        <InputError message={importForm.errors.slug} />
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 rounded-md border border-dashed p-4">
                                    <Checkbox
                                        id="collection_import_singleton"
                                        checked={importForm.data.is_singleton === true}
                                        onCheckedChange={(checked) => importForm.setData('is_singleton', checked === true)}
                                        className="mt-1"
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="collection_import_singleton">Single record collection</Label>
                                        <p className="text-muted-foreground text-sm">Limit this collection to one content record.</p>
                                    </div>
                                </div>

                                {importForm.progress && (
                                    <div className="space-y-2" aria-live="polite">
                                        <div className="text-muted-foreground flex justify-between text-sm">
                                            <span>Uploading package</span>
                                            <span>{importForm.progress.percentage}%</span>
                                        </div>
                                        <Progress value={importForm.progress.percentage} />
                                    </div>
                                )}

                                <Button type="submit" disabled={importForm.processing} className="w-full sm:w-auto">
                                    <Upload className="mr-2 h-4 w-4" />
                                    {importForm.processing ? 'Importing...' : 'Import collection'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Import Project</CardTitle>
                            <CardDescription>
                                Full project packages are imported when creating a new project. Open the project creation modal and select “Import
                                from file”.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                <FileJson className="h-4 w-4" />
                                <span>Project imports create a new project instead of replacing this one.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}
