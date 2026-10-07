import { usePage } from '@inertiajs/react';

import { Asset, UserCan } from '@/admin/types';

import { Badge } from '@/admin/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/admin/components/ui/card';
import { Checkbox } from '@/admin/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/admin/components/ui/tooltip';
import { File, FileAudio, FileImage, FileText, FileVideo } from 'lucide-react';

import AssetActionMenu from './AssetActionMenu';

interface AssetGridProps {
    assets: Asset[];
    selectedAssets: number[];
    onAssetSelect: (assetId: number) => void;
    onViewDetails: (asset: Asset) => void;
    onDelete: (asset: Asset) => void;
}

export default function AssetGrid({ assets, selectedAssets, onAssetSelect, onViewDetails, onDelete }: AssetGridProps) {
    const can = usePage().props.userCan as UserCan;

    // Handle thumbnail click - either select the asset or view details based on context
    const handleThumbnailClick = (asset: Asset, e: React.MouseEvent) => {
        // If shift key is pressed or other assets are already selected, select this asset
        if (e.shiftKey || selectedAssets.length > 0) {
            onAssetSelect(asset.id);
        } else {
            // Otherwise, view asset details
            onViewDetails(asset);
        }
    };

    if (assets.length === 0) {
        return (
            <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                    <File className="text-muted-foreground/50 mb-4 h-12 w-12" />
                    <p className="text-muted-foreground font-medium">No assets found</p>
                </CardContent>
            </Card>
        );
    }

    const getFileIcon = (asset: Asset) => {
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

    const isVideo = (asset: Asset) => {
        const extension = asset.extension.toLowerCase();
        return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(extension);
    };

    const isRasterImage = (asset: Asset) => {
        const extension = asset.extension.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {assets.map((asset) => (
                    <Card key={asset.id} className="overflow-hidden p-0">
                        <div
                            className="bg-muted group relative flex h-40 cursor-pointer items-center justify-center rounded-t-lg"
                            onClick={(e) => handleThumbnailClick(asset, e)}
                        >
                            {asset.thumbnail_url || (asset.pending_image_processing && isRasterImage(asset)) ? (
                                <img
                                    src={
                                        asset.pending_image_processing ? asset.url : (asset.thumbnail_url ?? asset.url)
                                    }
                                    alt={asset.metadata?.alt_text || asset.original_filename}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full rounded-t-lg object-cover"
                                />
                            ) : isVideo(asset) ? (
                                <video src={asset.url} preload="metadata" muted playsInline className="h-full w-full rounded-t-lg object-cover" />
                            ) : (
                                getFileIcon(asset)
                            )}

                            <div className="absolute top-2 left-2" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                    checked={selectedAssets.includes(asset.id)}
                                    onCheckedChange={() => onAssetSelect(asset.id)}
                                    className="h-8 w-8 rounded-md border-gray-300 bg-white shadow-sm data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white dark:border-gray-700 dark:bg-black dark:data-[state=checked]:border-emerald-500 dark:data-[state=checked]:bg-emerald-500"
                                />
                            </div>

                            {asset.pending_image_processing && (
                                <Badge variant="secondary" className="absolute bottom-2 right-2 text-xs shadow-sm">
                                    Processing
                                </Badge>
                            )}

                            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AssetActionMenu
                                                asset={asset}
                                                onViewDetails={onViewDetails}
                                                onDelete={onDelete}
                                                canUpdate={can.update_asset}
                                                canDelete={can.delete_asset}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>Options</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>

                        <CardContent>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="cursor-pointer truncate text-sm font-medium"
                                            title={asset.original_filename}
                                            onClick={(e) => handleThumbnailClick(asset, e)}
                                        >
                                            {asset.original_filename}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>{asset.original_filename}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardContent>
                        <CardFooter className="text-muted-foreground flex justify-between border-t px-3 py-2 text-xs">
                            <Badge variant="outline" className="h-5 text-xs">
                                {getFileIcon(asset)}
                                {asset.extension.toUpperCase()}
                            </Badge>
                            <span>{asset.formatted_size}</span>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
