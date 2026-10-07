import { useForm } from '@inertiajs/react';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Asset, Project } from '@/admin/types';
import { formatLocalDateTime } from '@/admin/lib/date';

import InputError from '@/admin/components/input-error';
import { Button } from '@/admin/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/admin/components/ui/dialog';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Textarea } from '@/admin/components/ui/textarea';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Crop,
    Download,
    File,
    FileAudio,
    FileImage,
    FileText,
    FileVideo,
    Lock,
    RotateCcw,
    RotateCw,
    Unlock,
} from 'lucide-react';
import ReactCrop, { Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface AssetDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    asset: Asset;
    onUpdate?: (updatedAsset: Asset) => void;
    onNavigate?: (direction: 'prev' | 'next') => void;
    canNavigatePrev?: boolean;
    canNavigateNext?: boolean;
}

type AspectPreset = 'free' | 'square' | 'standard' | 'wide';
type ImageEditMode = 'crop' | 'resize' | 'rotate';

const RESIZE_PRESETS = [1600, 1200, 800, 400] as const;

const getAspectForPreset = (preset: AspectPreset): number | undefined => {
    if (preset === 'square') {
        return 1;
    }

    if (preset === 'standard') {
        return 4 / 3;
    }

    if (preset === 'wide') {
        return 16 / 9;
    }

    return undefined;
};

const createCenteredCrop = (width: number, height: number, aspect?: number): CropType => {
    if (!aspect) {
        return {
            unit: '%',
            x: 5,
            y: 5,
            width: 90,
            height: 90,
        };
    }

    const maxCropSize = Math.floor(Math.min(width, height) * 0.9);

    return centerCrop(
        makeAspectCrop(
            {
                unit: 'px',
                width: maxCropSize,
            },
            aspect,
            width,
            height,
        ),
        width,
        height,
    );
};

export default function AssetDetailsModal({
    isOpen,
    onClose,
    project,
    asset: initialAsset,
    onUpdate,
    onNavigate,
    canNavigatePrev = false,
    canNavigateNext = false,
}: AssetDetailsModalProps) {
    const dialogContentRef = useRef<HTMLDivElement>(null);
    const [isImageEditing, setIsImageEditing] = useState(false);
    const [editMode, setEditMode] = useState<ImageEditMode>('crop');
    const [crop, setCrop] = useState<CropType>();
    const [completedCrop, setCompletedCrop] = useState<CropType>();
    const [aspectPreset, setAspectPreset] = useState<AspectPreset>('wide');
    const [asset, setAsset] = useState(initialAsset);
    const [copied, setCopied] = useState(false);
    const [copiedOriginalUrl, setCopiedOriginalUrl] = useState(false);
    const [copiedUuid, setCopiedUuid] = useState(false);
    const [copiedFilename, setCopiedFilename] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const cropViewportRef = useRef<HTMLDivElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isApplyingImageEdit, setIsApplyingImageEdit] = useState(false);
    const [cropViewportSize, setCropViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
    const [cropImageSize, setCropImageSize] = useState<{ width: number; height: number } | null>(null);
    const [resizeWidth, setResizeWidth] = useState('');
    const [resizeHeight, setResizeHeight] = useState('');
    const [lockAspectRatio, setLockAspectRatio] = useState(true);
    const [rotateQuarterTurns, setRotateQuarterTurns] = useState(0);

    const { data, setData, errors } = useForm({
        alt_text: initialAsset.metadata?.alt_text || '',
        title: initialAsset.metadata?.title || '',
        caption: initialAsset.metadata?.caption || '',
        description: initialAsset.metadata?.description || '',
        author: initialAsset.metadata?.author || '',
        copyright: initialAsset.metadata?.copyright || '',
    });

    // Update form data when initialAsset changes
    useEffect(() => {
        setData({
            alt_text: initialAsset.metadata?.alt_text || '',
            title: initialAsset.metadata?.title || '',
            caption: initialAsset.metadata?.caption || '',
            description: initialAsset.metadata?.description || '',
            author: initialAsset.metadata?.author || '',
            copyright: initialAsset.metadata?.copyright || '',
        });
    }, [initialAsset, setData]);

    // Update local asset state when prop changes
    useEffect(() => {
        setAsset(initialAsset);
    }, [initialAsset]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let cancelled = false;

        axios
            .get(route('assets.api.show', [project.id, initialAsset.id]))
            .then((response) => {
                if (!cancelled && response.data) {
                    setAsset(response.data as Asset);
                }
            })
            .catch(() => {
                // Keep existing modal data if details request fails.
            });

        return () => {
            cancelled = true;
        };
    }, [initialAsset.id, isOpen, project.id]);

    useEffect(() => {
        if (!isOpen) {
            setIsImageEditing(false);
            setEditMode('crop');
            setCrop(undefined);
            setCompletedCrop(undefined);
            setImageNaturalSize(null);
            setCropImageSize(null);
            setCropViewportSize({ width: 0, height: 0 });
            setResizeWidth('');
            setResizeHeight('');
            setLockAspectRatio(true);
            setRotateQuarterTurns(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !onNavigate) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName.toLowerCase();
            const isInputLike = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
            if (isInputLike) {
                return;
            }

            if (event.key === 'ArrowLeft' && canNavigatePrev) {
                event.preventDefault();
                onNavigate('prev');
            }

            if (event.key === 'ArrowRight' && canNavigateNext) {
                event.preventDefault();
                onNavigate('next');
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [canNavigateNext, canNavigatePrev, isOpen, onNavigate]);

    useEffect(() => {
        if (!isImageEditing || !imageNaturalSize) {
            return;
        }

        setResizeWidth(String(imageNaturalSize.width));
        setResizeHeight(String(imageNaturalSize.height));
    }, [isImageEditing, imageNaturalSize]);

    const getFileIcon = (asset: Asset) => {
        const extension = asset.extension.toLowerCase();

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
            return <FileImage className="h-10 w-10 text-blue-500" />;
        }

        if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(extension)) {
            return <FileVideo className="h-10 w-10 text-purple-500" />;
        }

        if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
            return <FileAudio className="h-10 w-10 text-green-500" />;
        }

        if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
            return <FileText className="h-10 w-10 text-yellow-500" />;
        }

        return <File className="text-muted-foreground h-10 w-10" />;
    };

    const formatDate = (dateString: string) => {
        return formatLocalDateTime(dateString, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await axios.put(route('assets.api.update', [project.id, asset.id]), data);

            if (response.data) {
                const updatedAsset = response.data;
                setAsset(updatedAsset);

                // Notify parent component if callback provided
                if (onUpdate) {
                    onUpdate(updatedAsset);
                }

                toast.success('Asset updated successfully');
            }
        } catch (error) {
            console.error('Error updating asset:', error);
            toast.error('Failed to update asset');
        } finally {
            setSubmitting(false);
        }
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setImageNaturalSize({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
        });
    };

    useEffect(() => {
        if (!isImageEditing || editMode !== 'crop' || !cropViewportRef.current) {
            return;
        }

        const viewport = cropViewportRef.current;
        const updateViewportSize = () => {
            setCropViewportSize({
                width: viewport.clientWidth,
                height: viewport.clientHeight,
            });
        };

        updateViewportSize();

        const resizeObserver = new ResizeObserver(updateViewportSize);
        resizeObserver.observe(viewport);

        return () => {
            resizeObserver.disconnect();
        };
    }, [editMode, isImageEditing]);

    useEffect(() => {
        if (!imageNaturalSize || cropViewportSize.width <= 0 || cropViewportSize.height <= 0) {
            setCropImageSize(null);
            return;
        }

        const scale = Math.min(cropViewportSize.width / imageNaturalSize.width, cropViewportSize.height / imageNaturalSize.height);

        setCropImageSize({
            width: Math.max(1, Math.floor(imageNaturalSize.width * scale)),
            height: Math.max(1, Math.floor(imageNaturalSize.height * scale)),
        });
    }, [imageNaturalSize, cropViewportSize]);

    useEffect(() => {
        if (!isImageEditing || editMode !== 'crop' || !cropImageSize) {
            return;
        }

        setCrop(createCenteredCrop(cropImageSize.width, cropImageSize.height, getAspectForPreset(aspectPreset)));
    }, [aspectPreset, cropImageSize, editMode, isImageEditing]);

    const normalizedQuarterTurns = useMemo(() => {
        const normalized = rotateQuarterTurns % 4;
        return normalized < 0 ? normalized + 4 : normalized;
    }, [rotateQuarterTurns]);

    const getActiveCropRect = useCallback(() => {
        if (editMode !== 'crop' || !completedCrop || completedCrop.width <= 0 || completedCrop.height <= 0 || !imageNaturalSize || !cropImageSize) {
            return null;
        }

        const scaleX = imageNaturalSize.width / cropImageSize.width;
        const scaleY = imageNaturalSize.height / cropImageSize.height;

        return {
            x: Math.max(0, Math.round(completedCrop.x * scaleX)),
            y: Math.max(0, Math.round(completedCrop.y * scaleY)),
            width: Math.max(1, Math.round(completedCrop.width * scaleX)),
            height: Math.max(1, Math.round(completedCrop.height * scaleY)),
        };
    }, [completedCrop, cropImageSize, editMode, imageNaturalSize]);

    const baseOutputDimensions = useMemo(() => {
        if (!imageNaturalSize) {
            return null;
        }

        const activeCropRect = getActiveCropRect();
        const baseWidth = activeCropRect?.width ?? imageNaturalSize.width;
        const baseHeight = activeCropRect?.height ?? imageNaturalSize.height;
        const effectiveQuarterTurns = editMode === 'rotate' ? normalizedQuarterTurns : 0;
        const isQuarterTurn = effectiveQuarterTurns % 2 === 1;

        return {
            width: isQuarterTurn ? baseHeight : baseWidth,
            height: isQuarterTurn ? baseWidth : baseHeight,
        };
    }, [editMode, getActiveCropRect, imageNaturalSize, normalizedQuarterTurns]);

    const outputDimensions = useMemo(() => {
        if (!baseOutputDimensions) {
            return null;
        }

        if (editMode !== 'resize') {
            return baseOutputDimensions;
        }

        const width = Number.parseInt(resizeWidth, 10);
        const height = Number.parseInt(resizeHeight, 10);

        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
            return baseOutputDimensions;
        }

        return { width, height };
    }, [baseOutputDimensions, editMode, resizeHeight, resizeWidth]);

    const applyResizePreset = (longestSide: number) => {
        if (!baseOutputDimensions) {
            return;
        }

        const { width, height } = baseOutputDimensions;
        const isLandscape = width >= height;
        const ratio = isLandscape ? height / width : width / height;
        const nextWidth = isLandscape ? longestSide : Math.max(1, Math.round(longestSide * ratio));
        const nextHeight = isLandscape ? Math.max(1, Math.round(longestSide * ratio)) : longestSide;

        setResizeWidth(String(nextWidth));
        setResizeHeight(String(nextHeight));
    };

    const handleResizeWidthChange = (value: string) => {
        setResizeWidth(value);

        if (!lockAspectRatio || !baseOutputDimensions) {
            return;
        }

        const nextWidth = Number.parseInt(value, 10);
        if (!Number.isInteger(nextWidth) || nextWidth <= 0) {
            return;
        }

        const aspectRatio = baseOutputDimensions.width / baseOutputDimensions.height;
        const nextHeight = Math.max(1, Math.round(nextWidth / aspectRatio));
        setResizeHeight(String(nextHeight));
    };

    const handleResizeHeightChange = (value: string) => {
        setResizeHeight(value);

        if (!lockAspectRatio || !baseOutputDimensions) {
            return;
        }

        const nextHeight = Number.parseInt(value, 10);
        if (!Number.isInteger(nextHeight) || nextHeight <= 0) {
            return;
        }

        const aspectRatio = baseOutputDimensions.width / baseOutputDimensions.height;
        const nextWidth = Math.max(1, Math.round(nextHeight * aspectRatio));
        setResizeWidth(String(nextWidth));
    };

    const resetImageEditState = () => {
        setRotateQuarterTurns(0);
        setCompletedCrop(undefined);
        if (cropImageSize) {
            setCrop(createCenteredCrop(cropImageSize.width, cropImageSize.height, getAspectForPreset(aspectPreset)));
        }
        if (imageNaturalSize) {
            setResizeWidth(String(imageNaturalSize.width));
            setResizeHeight(String(imageNaturalSize.height));
        }
    };

    const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                        return;
                    }

                    reject(new Error('Failed to create image blob'));
                },
                'image/webp',
                0.95,
            );
        });
    };

    const handleApplyImageEdit = async () => {
        if (!imageNaturalSize) {
            toast.error('Image is not ready yet');
            return;
        }

        if (editMode === 'crop' && !getActiveCropRect()) {
            toast.error('Select a crop area first');
            return;
        }

        const nextWidth = Number.parseInt(resizeWidth, 10);
        const nextHeight = Number.parseInt(resizeHeight, 10);
        if (editMode === 'resize' && (!Number.isInteger(nextWidth) || !Number.isInteger(nextHeight) || nextWidth <= 0 || nextHeight <= 0)) {
            toast.error('Resize values must be positive numbers');
            return;
        }

        try {
            setIsApplyingImageEdit(true);

            const sourceImage = new Image();
            sourceImage.src = asset.url;
            await sourceImage.decode();

            const cropRect = getActiveCropRect();
            const sourceWidth = cropRect?.width ?? sourceImage.naturalWidth;
            const sourceHeight = cropRect?.height ?? sourceImage.naturalHeight;
            const sourceX = cropRect?.x ?? 0;
            const sourceY = cropRect?.y ?? 0;

            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = sourceWidth;
            croppedCanvas.height = sourceHeight;
            const croppedContext = croppedCanvas.getContext('2d');
            if (!croppedContext) {
                throw new Error('Failed to prepare crop canvas');
            }
            croppedContext.imageSmoothingQuality = 'high';
            croppedContext.drawImage(sourceImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

            const quarterTurns = editMode === 'rotate' ? normalizedQuarterTurns : 0;
            const isQuarterTurn = quarterTurns % 2 === 1;
            const rotatedCanvas = document.createElement('canvas');
            rotatedCanvas.width = isQuarterTurn ? sourceHeight : sourceWidth;
            rotatedCanvas.height = isQuarterTurn ? sourceWidth : sourceHeight;
            const rotatedContext = rotatedCanvas.getContext('2d');
            if (!rotatedContext) {
                throw new Error('Failed to prepare rotate canvas');
            }
            rotatedContext.imageSmoothingQuality = 'high';
            rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
            rotatedContext.rotate((quarterTurns * Math.PI) / 2);
            rotatedContext.drawImage(croppedCanvas, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
            rotatedContext.setTransform(1, 0, 0, 1, 0, 0);

            const shouldResize = editMode === 'resize';
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = shouldResize ? nextWidth : rotatedCanvas.width;
            finalCanvas.height = shouldResize ? nextHeight : rotatedCanvas.height;
            const finalContext = finalCanvas.getContext('2d');
            if (!finalContext) {
                throw new Error('Failed to prepare output canvas');
            }
            finalContext.imageSmoothingQuality = 'high';
            finalContext.drawImage(rotatedCanvas, 0, 0, finalCanvas.width, finalCanvas.height);

            const blob = await canvasToBlob(finalCanvas);

            const formData = new FormData();
            formData.append('file', blob, asset.original_filename);
            formData.append('_method', 'PUT');

            const response = await axios.post(route('assets.crop', [project.id, asset.id]), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data) {
                const updatedAsset = response.data as Asset;
                setAsset(updatedAsset);

                if (onUpdate) {
                    onUpdate(updatedAsset);
                }

                toast.success('Image updated successfully');
                setIsImageEditing(false);
                setCompletedCrop(undefined);
            }
        } catch {
            toast.error('Failed to update image');
        } finally {
            setIsApplyingImageEdit(false);
        }
    };

    const resetCrop = () => {
        if (!cropImageSize) {
            return;
        }

        setCrop(createCenteredCrop(cropImageSize.width, cropImageSize.height, getAspectForPreset(aspectPreset)));
        setCompletedCrop(undefined);
    };

    const handleCopyUuid = async () => {
        try {
            await navigator.clipboard.writeText(asset.uuid);
            setCopiedUuid(true);
            toast.success('UUID copied to clipboard');
            setTimeout(() => setCopiedUuid(false), 2000);
        } catch {
            toast.error('Failed to copy UUID');
        }
    };

    const handleCopyFilename = async () => {
        try {
            await navigator.clipboard.writeText(asset.original_filename);
            setCopiedFilename(true);
            toast.success('Filename copied to clipboard');
            setTimeout(() => setCopiedFilename(false), 2000);
        } catch {
            toast.error('Failed to copy filename');
        }
    };

    const handleCopyUrl = async () => {
        try {
            const urlToCopy = asset.full_url || asset.url;
            await navigator.clipboard.writeText(urlToCopy);
            setCopied(true);
            toast.success('URL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy URL');
        }
    };

    const handleCopyOriginalUrl = async () => {
        if (!asset.original_url) {
            return;
        }

        try {
            await navigator.clipboard.writeText(asset.original_url);
            setCopiedOriginalUrl(true);
            toast.success('Original URL copied to clipboard');
            setTimeout(() => setCopiedOriginalUrl(false), 2000);
        } catch {
            toast.error('Failed to copy original URL');
        }
    };

    const extension = asset.extension.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
    const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(extension) || asset.mime_type.startsWith('video/');
    const isAudio = ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension) || asset.mime_type.startsWith('audio/');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                ref={dialogContentRef}
                tabIndex={-1}
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    dialogContentRef.current?.focus();
                }}
                className="overflow-y-auto sm:max-w-4xl"
            >
                <DialogHeader className="flex flex-col gap-3 space-y-0 p-0 pr-8 sm:flex-row sm:items-center sm:justify-between">
                    <DialogTitle className="min-w-0 truncate text-lg font-medium">{asset.original_filename}</DialogTitle>
                    <DialogDescription className="sr-only">{asset.metadata?.alt_text || asset.original_filename}</DialogDescription>
                    <div className="flex flex-wrap items-center gap-2">
                        {onNavigate && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onNavigate('prev')}
                                    disabled={!canNavigatePrev}
                                    aria-label="Previous file"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onNavigate('next')}
                                    disabled={!canNavigateNext}
                                    aria-label="Next file"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {isImage && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => {
                                        const nextEditingState = !isImageEditing;
                                        setIsImageEditing(nextEditingState);
                                        if (!nextEditingState) {
                                            setCompletedCrop(undefined);
                                            setEditMode('crop');
                                            setRotateQuarterTurns(0);
                                        } else {
                                            setEditMode('crop');
                                        }
                                    }}
                                >
                                    <Crop className="h-3.5 w-3.5" />
                                    {isImageEditing ? 'Cancel Edit' : 'Edit Image'}
                                </Button>
                            </>
                        )}
                        <a href={asset.url} download>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5">
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </Button>
                        </a>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Asset Preview */}
                    <div className={`${isImageEditing ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
                        <div
                            className={`bg-muted flex items-center justify-center rounded-md ${isImageEditing ? 'h-[calc(100vh-200px)] overflow-hidden' : 'h-[250px] overflow-hidden'}`}
                        >
                            {isImage ? (
                                isImageEditing ? (
                                    <div className="flex h-full w-full flex-col gap-3 p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground mr-1 text-xs">Mode:</span>
                                            <Button
                                                variant={editMode === 'crop' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-7 px-2"
                                                onClick={() => setEditMode('crop')}
                                            >
                                                Crop
                                            </Button>
                                            <Button
                                                variant={editMode === 'resize' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-7 px-2"
                                                onClick={() => setEditMode('resize')}
                                            >
                                                Resize
                                            </Button>
                                            <Button
                                                variant={editMode === 'rotate' ? 'default' : 'outline'}
                                                size="sm"
                                                className="h-7 px-2"
                                                onClick={() => setEditMode('rotate')}
                                            >
                                                Rotate
                                            </Button>
                                            {editMode === 'rotate' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        title="Rotate left 90 degrees"
                                                        onClick={() => setRotateQuarterTurns((value) => value - 1)}
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        title="Rotate right 90 degrees"
                                                        onClick={() => setRotateQuarterTurns((value) => value + 1)}
                                                    >
                                                        <RotateCw className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <span className="text-muted-foreground text-xs">Angle: {normalizedQuarterTurns * 90}°</span>
                                                </>
                                            )}
                                        </div>

                                        {editMode === 'crop' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-muted-foreground mr-1 text-xs">Aspect:</span>
                                                <Button
                                                    variant={aspectPreset === 'free' ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-7 px-2"
                                                    onClick={() => setAspectPreset('free')}
                                                >
                                                    Free
                                                </Button>
                                                <Button
                                                    variant={aspectPreset === 'square' ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-7 px-2"
                                                    onClick={() => setAspectPreset('square')}
                                                >
                                                    1:1
                                                </Button>
                                                <Button
                                                    variant={aspectPreset === 'standard' ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-7 px-2"
                                                    onClick={() => setAspectPreset('standard')}
                                                >
                                                    4:3
                                                </Button>
                                                <Button
                                                    variant={aspectPreset === 'wide' ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="h-7 px-2"
                                                    onClick={() => setAspectPreset('wide')}
                                                >
                                                    16:9
                                                </Button>
                                            </div>
                                        )}

                                        <div ref={cropViewportRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                                            {editMode === 'crop' ? (
                                                <ReactCrop
                                                    crop={crop}
                                                    onChange={(c) => setCrop(c)}
                                                    onComplete={(c) => setCompletedCrop(c)}
                                                    aspect={getAspectForPreset(aspectPreset)}
                                                    className="shrink-0"
                                                    minWidth={50}
                                                    minHeight={50}
                                                    ruleOfThirds
                                                >
                                                    <img
                                                        ref={imgRef}
                                                        src={asset.url}
                                                        alt={asset.metadata?.alt_text || asset.original_filename}
                                                        onLoad={onImageLoad}
                                                        style={{
                                                            display: 'block',
                                                            ...(cropImageSize
                                                                ? {
                                                                      width: `${cropImageSize.width}px`,
                                                                      height: `${cropImageSize.height}px`,
                                                                  }
                                                                : {
                                                                      maxWidth: '100%',
                                                                      maxHeight: '100%',
                                                                  }),
                                                        }}
                                                    />
                                                </ReactCrop>
                                            ) : (
                                                <img
                                                    ref={imgRef}
                                                    src={asset.url}
                                                    alt={asset.metadata?.alt_text || asset.original_filename}
                                                    onLoad={onImageLoad}
                                                    className="max-h-full max-w-full object-contain"
                                                    style={{
                                                        transform:
                                                            editMode === 'rotate' && normalizedQuarterTurns
                                                                ? `rotate(${normalizedQuarterTurns * 90}deg)`
                                                                : undefined,
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {editMode === 'resize' && (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-muted-foreground mr-1 text-xs">Presets:</span>
                                                    {RESIZE_PRESETS.map((preset) => (
                                                        <Button
                                                            key={preset}
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2"
                                                            onClick={() => applyResizePreset(preset)}
                                                        >
                                                            {preset}px
                                                        </Button>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                    <Input
                                                        value={resizeWidth}
                                                        onChange={(event) => handleResizeWidthChange(event.target.value)}
                                                        placeholder="Width (px)"
                                                    />
                                                    <Input
                                                        value={resizeHeight}
                                                        onChange={(event) => handleResizeHeightChange(event.target.value)}
                                                        placeholder="Height (px)"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-9 w-9"
                                                        title={lockAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                                                        onClick={() => setLockAspectRatio((value) => !value)}
                                                    >
                                                        {lockAspectRatio ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-muted-foreground text-xs">
                                                {editMode === 'crop'
                                                    ? completedCrop?.width && completedCrop?.height
                                                        ? `Selected area: ${Math.round(completedCrop.width)} x ${Math.round(completedCrop.height)}`
                                                        : 'Drag to select crop area'
                                                    : outputDimensions
                                                      ? `Output: ${outputDimensions.width} x ${outputDimensions.height}`
                                                      : 'Output dimensions unavailable'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5"
                                                    onClick={editMode === 'crop' ? resetCrop : resetImageEditState}
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Reset
                                                </Button>
                                                <Button onClick={handleApplyImageEdit} size="sm" className="gap-1.5" disabled={isApplyingImageEdit}>
                                                    <RotateCw className="h-3.5 w-3.5" />
                                                    {isApplyingImageEdit ? 'Applying...' : 'Apply Changes'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <a href={asset.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium">
                                        <img
                                            src={asset.url}
                                            alt={asset.metadata?.alt_text || asset.original_filename}
                                            className="max-w-full rounded-md object-contain"
                                        />
                                    </a>
                                )
                            ) : isVideo ? (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
                                    <video
                                        src={asset.url}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        disablePictureInPicture
                                        controlsList="nodownload noplaybackrate noremoteplayback"
                                        className="max-h-full max-w-full rounded-md object-contain"
                                    >
                                        Your browser does not support the video element.
                                    </video>
                                </div>
                            ) : isAudio ? (
                                <div className="flex w-full max-w-xl flex-col items-center justify-center gap-3 px-4">
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <FileAudio className="h-4 w-4" />
                                        <span className="truncate">{asset.original_filename}</span>
                                    </div>
                                    <audio
                                        src={asset.url}
                                        controls
                                        preload="metadata"
                                        controlsList="nodownload noplaybackrate noremoteplayback"
                                        className="w-full"
                                    >
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center">
                                    {getFileIcon(asset)}
                                    <span className="mt-2 text-sm font-medium">{asset.extension.toUpperCase()} File</span>
                                </div>
                            )}
                        </div>

                        {/* Asset Information */}
                        {!isImageEditing && (
                            <div className="bg-muted/50 rounded-md p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-base font-medium">File Information</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Filename</Label>
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            <p className="truncate text-sm font-medium">{asset.original_filename}</p>
                                            <div className="hover:text-primary cursor-pointer" onClick={handleCopyFilename}>
                                                {copiedFilename ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">File ID</Label>
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            <p className="truncate text-sm font-medium">{asset.uuid}</p>
                                            <div className="hover:text-primary cursor-pointer" onClick={handleCopyUuid}>
                                                {copiedUuid ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">File URL</Label>
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm font-medium">
                                                {asset.full_url || asset.url}
                                            </a>
                                            <div className="hover:text-primary cursor-pointer" onClick={handleCopyUrl}>
                                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                            </div>
                                        </div>
                                    </div>
                                    {asset.original_url && (
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Original File URL</Label>
                                            <div className="mt-0.5 flex items-center gap-1.5">
                                                <a
                                                    href={asset.original_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="truncate text-sm font-medium"
                                                >
                                                    {asset.original_url}
                                                </a>
                                                <div className="hover:text-primary cursor-pointer" onClick={handleCopyOriginalUrl}>
                                                    {copiedOriginalUrl ? (
                                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-muted-foreground text-xs">File Type</Label>
                                        <p className="text-sm font-medium">{asset.mime_type}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">File Size</Label>
                                        <p className="text-sm font-medium">{asset.formatted_size}</p>
                                    </div>
                                    {isImage && asset.metadata?.width && asset.metadata?.height && (
                                        <div>
                                            <Label className="text-muted-foreground text-xs">Dimensions</Label>
                                            <p className="text-sm font-medium">
                                                {asset.metadata.width} × {asset.metadata.height} px
                                            </p>
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground text-xs">Usage</Label>
                                        <p className="text-sm font-medium">
                                            {asset.usage_summary
                                                ? `${asset.usage_summary.total_entries} entr${asset.usage_summary.total_entries === 1 ? 'y' : 'ies'} (${asset.usage_summary.total_relations} reference${asset.usage_summary.total_relations === 1 ? '' : 's'})`
                                                : 'No usage data'}
                                        </p>
                                        {!!asset.usage_summary?.entries?.length && (
                                            <div className="mt-1 space-y-1">
                                                {asset.usage_summary.entries.slice(0, 5).map((entry) => (
                                                    <p
                                                        key={`${entry.entry_id}-${entry.field_name ?? 'field'}`}
                                                        className="text-muted-foreground truncate text-xs"
                                                    >
                                                        {(() => {
                                                            const usageEntry = entry as { state?: string };
                                                            const state = usageEntry.state ?? 'draft';

                                                            return (
                                                                <>
                                                        {entry.collection_name || 'Collection'} / {entry.field_label || entry.field_name || 'Field'} /{' '}
                                                        {entry.locale || 'n/a'} / {state}
                                                                </>
                                                            );
                                                        })()}
                                                    </p>
                                                ))}
                                                {asset.usage_summary.entries.length > 5 && (
                                                    <p className="text-muted-foreground text-xs">+{asset.usage_summary.entries.length - 5} more</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Uploaded</Label>
                                        <p className="text-sm font-medium">{formatDate(asset.created_at)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground text-xs">Modified</Label>
                                        <p className="text-sm font-medium">{formatDate(asset.updated_at)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit Form */}
                    {!isImageEditing && (
                        <div>
                            <div className="bg-muted/50 rounded-md p-3 pb-5">
                                <form onSubmit={handleSubmit} className="space-y-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="alt_text" className="text-xs">
                                            Alt Text
                                        </Label>
                                        <Input
                                            id="alt_text"
                                            value={data.alt_text}
                                            onChange={(e) => setData('alt_text', e.target.value)}
                                            placeholder="Enter alt text"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.alt_text} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="title" className="text-xs">
                                            Title
                                        </Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Enter title"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.title} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="caption" className="text-xs">
                                            Caption
                                        </Label>
                                        <Textarea
                                            id="caption"
                                            value={data.caption}
                                            onChange={(e) => setData('caption', e.target.value)}
                                            placeholder="Enter caption"
                                            rows={2}
                                            className="text-sm"
                                        />
                                        <InputError message={errors.caption} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="description" className="text-xs">
                                            Description
                                        </Label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                            placeholder="Enter description"
                                            rows={3}
                                            className="text-sm"
                                        />
                                        <InputError message={errors.description} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="author" className="text-xs">
                                            Author
                                        </Label>
                                        <Input
                                            id="author"
                                            value={data.author}
                                            onChange={(e) => setData('author', e.target.value)}
                                            placeholder="Enter author name"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.author} />
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="copyright" className="text-xs">
                                            Copyright
                                        </Label>
                                        <Input
                                            id="copyright"
                                            value={data.copyright}
                                            onChange={(e) => setData('copyright', e.target.value)}
                                            placeholder="Enter copyright information"
                                            className="h-8 text-sm"
                                        />
                                        <InputError message={errors.copyright} />
                                    </div>

                                    <Button type="submit" disabled={submitting} className="mt-2 w-full">
                                        {submitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
