import { Asset, UserCan } from '@/admin/types';
import { formatLocalDate } from '@/admin/lib/date';

import { Badge } from '@/admin/components/ui/badge';
import { Checkbox } from '@/admin/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin/components/ui/table';
import { File, FileAudio, FileImage, FileText, FileVideo } from 'lucide-react';

import { usePage } from '@inertiajs/react';
import ActionMenu from './AssetActionMenu';

interface AssetTableProps {
    assets: Asset[];
    selectedAssets: number[];
    onAssetSelect: (assetId: number) => void;
    onViewDetails: (asset: Asset) => void;
    onDelete: (asset: Asset) => void;
}

const getFileIcon = (asset: Asset) => {
    const extension = asset.extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        return <FileImage className="h-6 w-6 text-primary" />;
    } else if (['mp4', 'webm', 'mov'].includes(extension)) {
        return <FileVideo className="h-6 w-6 text-destructive" />;
    } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
        return <FileAudio className="h-6 w-6 text-primary" />;
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
        return <FileText className="h-6 w-6 text-sidebar-foreground/80" />;
    }
    return <File className="h-6 w-6 text-sidebar-foreground/70" />;
};

const getFileTypeClass = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
        return 'hover:bg-accent/40';
    } else if (['mp4', 'webm', 'mov'].includes(ext)) {
        return 'hover:bg-accent/40';
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
        return 'hover:bg-accent/40';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
        return 'hover:bg-accent/40';
    }
    return '';
};

const isVideo = (asset: Asset) => {
    const extension = asset.extension.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv'].includes(extension);
};

export default function AssetTable({ assets, selectedAssets, onAssetSelect, onViewDetails, onDelete }: AssetTableProps) {
    const can = usePage().props.userCan as UserCan;

    if (assets.length === 0) {
        return <div className="py-12 text-center text-sidebar-foreground/70">No assets found</div>;
    }

    return (
        <div className="overflow-x-auto rounded-md border border-sidebar-border/70 bg-sidebar">
            <Table>
                <TableHeader className="border-b border-sidebar-border/70 bg-sidebar/60">
                    <TableRow className="hover:bg-sidebar/60">
                        {can.delete_asset && <TableHead className="w-10 text-center align-middle"></TableHead>}
                        <TableHead className="w-12 text-center align-middle"></TableHead>
                        <TableHead className="align-middle">Name</TableHead>
                        <TableHead className="align-middle">Type</TableHead>
                        <TableHead className="align-middle">Size</TableHead>
                        <TableHead className="align-middle">Date Added</TableHead>
                        {(can.update_asset || can.delete_asset) && <TableHead className="w-10 text-center align-middle">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {assets.map((asset) => (
                        <TableRow key={asset.id} className={getFileTypeClass(asset.extension)}>
                            <TableCell className="py-2 align-middle">
                                <Checkbox
                                    checked={selectedAssets.includes(asset.id)}
                                    onCheckedChange={() => onAssetSelect(asset.id)}
                                />
                            </TableCell>
                            <TableCell className="py-2 text-center align-middle">
                                {asset.thumbnail_url ? (
                                    <div className="h-10 w-10 overflow-hidden">
                                        <img
                                            src={asset.thumbnail_url}
                                            alt={asset.metadata?.alt_text || asset.original_filename}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : isVideo(asset) ? (
                                    <div className="h-10 w-10 overflow-hidden">
                                        <video src={asset.url} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="flex h-10 w-10 items-center justify-center">{getFileIcon(asset)}</div>
                                )}
                            </TableCell>
                            <TableCell className="py-2 align-middle">
                                <span className="cursor-pointer hover:underline" onClick={() => onViewDetails(asset)}>
                                    {asset.original_filename}
                                </span>
                            </TableCell>
                            <TableCell className="py-2 align-middle">
                                <Badge variant="outline" className="flex items-center gap-1 border-sidebar-border/60 bg-sidebar-accent/40 px-2 py-1 text-sidebar-foreground">
                                    {getFileIcon(asset)}
                                    <span>{asset.extension.toUpperCase()}</span>
                                </Badge>
                            </TableCell>
                            <TableCell className="py-2 text-sm text-sidebar-foreground/70">{asset.formatted_size}</TableCell>
                            <TableCell className="py-2 align-middle text-sm text-sidebar-foreground/70">
                                {formatLocalDate(asset.created_at)}
                            </TableCell>
                            {(can.update_asset || can.delete_asset) && (
                                <TableCell className="py-2 text-center align-middle">
                                    <ActionMenu
                                        asset={asset}
                                        onViewDetails={onViewDetails}
                                        onDelete={onDelete}
                                        canUpdate={can.update_asset}
                                        canDelete={can.delete_asset}
                                    />
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
