import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Asset, Project } from '@/admin/types';

import FieldBase, { FieldProps } from './FieldBase';

import { Button } from '@/admin/components/ui/button';
import { Card, CardContent, CardFooter } from '@/admin/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/admin/components/ui/tooltip';
import { File, FileAudio, FileImage, FileText, FileVideo, FolderOpen, GripVertical, X } from 'lucide-react';

import { Badge } from '@/admin/components/ui/badge';
import AssetDetailsModal from '@/pages/admin/Assets/AssetDetailsModal';
import { MediaLibraryModal } from '@/pages/admin/Assets/MediaFieldSelectModal';

interface PageProps extends InertiaPageProps {
    project: Project;
}

export default function MediaField({ field, value, onChange, processing, errors }: FieldProps) {
    const { project } = usePage<PageProps>().props;

    // Add transformation of media.type to multiple property
    const isMultiple = field.options?.multiple || field.options?.media?.type === 2;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
    const [selectedAssetForModal, setSelectedAssetForModal] = useState<Asset | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [draggedAssetIndex, setDraggedAssetIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Update selectedAssets whenever value changes
    useEffect(() => {
        // Reset selected assets if value is empty
        if (!value) {
            setSelectedAssets([]);
            return;
        }

        // Handle single media field
        if (!isMultiple) {
            const assetId = Array.isArray(value) ? value[0] : value;
            if (!assetId) {
                setSelectedAssets([]);
                return;
            }

            // Fetch the asset details
            fetch(route('assets.api.show', [project.id, assetId]))
                .then((res) => res.json())
                .then((asset) => {
                    setSelectedAssets([asset]);
                })
                .catch((error) => {
                    console.error('Failed to load asset:', error);
                    setSelectedAssets([]);
                });
            return;
        }

        // Handle multiple media field
        if (!Array.isArray(value) || value.length === 0) {
            setSelectedAssets([]);
            return;
        }

        // Fetch all asset details in parallel
        Promise.all(value.map((id) => fetch(route('assets.api.show', [project.id, id])).then((res) => res.json())))
            .then((assets) => {
                setSelectedAssets(assets);
            })
            .catch((error) => {
                console.error('Failed to load assets:', error);
                setSelectedAssets([]);
            });
    }, [value, isMultiple, project.id]);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSelectAssets = (assets: Asset[]) => {
        setSelectedAssets(assets);

        // Update form value based on selection
        if (isMultiple) {
            // For multiple assets, send array of IDs
            onChange(
                field,
                assets.map((asset) => asset.id),
            );
        } else {
            // For single asset, send single ID or null
            onChange(field, assets.length > 0 ? assets[0].id : null);
        }
    };

    const handleRemoveAsset = (assetToRemove: Asset) => {
        const updatedAssets = selectedAssets.filter((asset) => asset.id !== assetToRemove.id);
        setSelectedAssets(updatedAssets);

        // Update form value based on selection
        if (isMultiple) {
            // For multiple assets, send array of IDs
            onChange(
                field,
                updatedAssets.map((asset) => asset.id),
            );
        } else {
            // For single asset, send single ID or null
            onChange(field, updatedAssets.length > 0 ? updatedAssets[0].id : null);
        }
    };

    const handleAssetDrop = (targetIndex: number) => {
        if (draggedAssetIndex === null || draggedAssetIndex === targetIndex) {
            setDraggedAssetIndex(null);
            setDragOverIndex(null);
            return;
        }

        const reorderedAssets = [...selectedAssets];
        const [movedAsset] = reorderedAssets.splice(draggedAssetIndex, 1);
        reorderedAssets.splice(targetIndex, 0, movedAsset);

        setSelectedAssets(reorderedAssets);
        onChange(
            field,
            reorderedAssets.map((asset) => asset.id),
        );
        setDraggedAssetIndex(null);
        setDragOverIndex(null);
    };

    const handleAssetDragEnd = () => {
        setDraggedAssetIndex(null);
        setDragOverIndex(null);
    };

    const handleOpenAssetDetails = (asset: Asset) => {
        setSelectedAssetForModal(asset);
        setShowDetailsModal(true);
    };

    const handleAssetDetailsUpdated = (updatedAsset: Asset) => {
        setSelectedAssets((currentAssets) => currentAssets.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset)));
        setSelectedAssetForModal(updatedAsset);
    };

    const getFileIcon = (asset: Asset) => {
        if (!asset || !asset.extension) {
            return <File className="text-muted-foreground h-8 w-8" />;
        }

        const extension = asset.extension.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
            return <FileImage className="h-8 w-8 text-blue-500" />;
        }

        if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(extension)) {
            return <FileVideo className="h-8 w-8 text-purple-500" />;
        }

        if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
            return <FileAudio className="h-8 w-8 text-green-500" />;
        }

        if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
            return <FileText className="h-8 w-8 text-yellow-500" />;
        }

        return <File className="text-muted-foreground h-8 w-8" />;
    };

    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors}>
            <div className="flex flex-col gap-4">
                <div className="w-full min-w-0">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={processing}
                        onClick={handleOpenModal}
                        className="h-auto min-h-10 w-full min-w-0 justify-center gap-2 whitespace-normal border-sidebar-border/70 bg-sidebar px-4 py-2.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground sm:w-auto sm:max-w-full"
                    >
                        <FolderOpen className="h-4 w-4 shrink-0" />
                        <span className="text-center leading-snug sm:text-left">
                            {selectedAssets.length === 0 ? `Select ${isMultiple ? 'files' : 'a file'}` : `Change ${isMultiple ? 'files' : 'a file'}`}
                        </span>
                    </Button>
                </div>

                {/* Display selected assets */}
                {selectedAssets.length > 0 && (
                    <>
                        {isMultiple ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                {selectedAssets.map((asset, index) => (
                                    <div key={asset.id}>
                                        <div
                                            draggable
                                            onDragStart={() => {
                                                setDraggedAssetIndex(index);
                                                setDragOverIndex(index);
                                            }}
                                            onDragEnter={() => setDragOverIndex(index)}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => handleAssetDrop(dragOverIndex ?? index)}
                                            onDragEnd={handleAssetDragEnd}
                                            className={[
                                                draggedAssetIndex === index ? 'opacity-40' : '',
                                                draggedAssetIndex !== null && dragOverIndex === index && draggedAssetIndex !== index
                                                    ? 'rounded-lg ring-2 ring-dashed ring-primary/60 ring-offset-2'
                                                    : '',
                                            ].join(' ')}
                                        >
                                            <Card className="overflow-hidden p-0">
                                                <div
                                                    className="group bg-muted relative flex h-40 cursor-pointer items-center justify-center"
                                                    onClick={() => handleOpenAssetDetails(asset)}
                                                >
                                                    {asset.thumbnail_url ? (
                                                        <img
                                                            src={asset.thumbnail_url}
                                                            alt={asset.metadata?.alt_text || asset.original_filename}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        getFileIcon(asset)
                                                    )}

                                                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

                                                    <div className="absolute top-2 left-2">
                                                        <div className="bg-background/80 text-muted-foreground rounded-md p-1" title="Drag to reorder">
                                                            <GripVertical className="h-4 w-4" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-2 right-2">
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-7 w-7 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleRemoveAsset(asset);
                                                            }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <CardContent>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="w-full cursor-pointer truncate text-left text-sm font-medium hover:underline"
                                                                    title={asset.original_filename}
                                                                    onClick={() => handleOpenAssetDetails(asset)}
                                                                >
                                                                    {asset.original_filename}
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>{asset.original_filename}</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </CardContent>

                                                <CardFooter className="text-muted-foreground flex justify-between border-t px-3 py-2 text-xs">
                                                    <Badge variant="outline" className="flex h-5 items-center gap-1 text-xs">
                                                        {asset.extension?.toUpperCase() || 'FILE'}
                                                    </Badge>
                                                    <span>{asset.formatted_size || 'Unknown size'}</span>
                                                </CardFooter>
                                            </Card>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                {selectedAssets.map((asset, index) => (
                                    <Card key={`${asset.id}-${index}`} className="overflow-hidden p-0">
                                        <div
                                            className="group bg-muted relative flex h-40 cursor-pointer items-center justify-center"
                                            onClick={() => handleOpenAssetDetails(asset)}
                                        >
                                            {asset.thumbnail_url ? (
                                                <img
                                                    src={asset.thumbnail_url}
                                                    alt={asset.metadata?.alt_text || asset.original_filename}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                getFileIcon(asset)
                                            )}

                                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />

                                            <div className="absolute top-2 right-2">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleRemoveAsset(asset);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <CardContent>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="w-full cursor-pointer truncate text-left text-sm font-medium hover:underline"
                                                            title={asset.original_filename}
                                                            onClick={() => handleOpenAssetDetails(asset)}
                                                        >
                                                            {asset.original_filename}
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{asset.original_filename}</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </CardContent>

                                        <CardFooter className="text-muted-foreground flex justify-between border-t px-3 py-2 text-xs">
                                            <Badge variant="outline" className="flex h-5 items-center gap-1 text-xs">
                                                {asset.extension?.toUpperCase() || 'FILE'}
                                            </Badge>
                                            <span>{asset.formatted_size || 'Unknown size'}</span>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Media Library Modal */}
                <MediaLibraryModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    project={project}
                    onSelect={handleSelectAssets}
                    currentlySelected={selectedAssets}
                    allowMultiple={isMultiple}
                />

                {selectedAssetForModal && (
                    <AssetDetailsModal
                        isOpen={showDetailsModal}
                        onClose={() => setShowDetailsModal(false)}
                        project={project}
                        asset={selectedAssetForModal}
                        onUpdate={handleAssetDetailsUpdated}
                    />
                )}
            </div>
        </FieldBase>
    );
}
