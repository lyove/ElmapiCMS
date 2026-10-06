import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { SearchBar } from '@/components/ui/search-bar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, Calendar, LayoutGrid, List, Plus, X } from 'lucide-react';

import AssetDetailsModal from '@/pages/Assets/AssetDetailsModal';
import AssetGrid from '@/pages/Assets/AssetGrid';
import AssetTable from '@/pages/Assets/AssetTable';
import AssetUploader from '@/pages/Assets/AssetUploader';

import MultiSelect from '@/components/ui/select/Select';
import type { Asset, Project } from '@/types';
import { DialogDescription } from '@radix-ui/react-dialog';

interface MediaLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    onSelect: (assets: Asset[]) => void;
    currentlySelected?: Asset[];
    allowMultiple?: boolean;
}

interface SelectOption {
    value: string;
    label: string;
}

export function MediaLibraryModal({ isOpen, onClose, project, onSelect, currentlySelected = [], allowMultiple = false }: MediaLibraryModalProps) {
    const [assets, setAssets] = useState<{
        data: Asset[];
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
        from: number;
        to: number;
    }>({
        data: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10,
        from: 0,
        to: 0,
    });

    const [loading, setLoading] = useState(true);
    const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
    const [selectedAssetObjects, setSelectedAssetObjects] = useState<Asset[]>([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [assetType, setAssetType] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [sortOption, setSortOption] = useState('newest');
    const [showUploader, setShowUploader] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState('10');
    const [selectedAssetForModal, setSelectedAssetForModal] = useState<Asset | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const selectedAssetsRef = useRef<number[]>([]);

    // Reset the selected assets when the modal is opened
    useEffect(() => {
        if (isOpen) {
            // When modal opens, use the currentlySelected assets as the initial selection
            if (currentlySelected && currentlySelected.length > 0) {
                const initialSelectedIds = currentlySelected.map((asset) => asset.id);
                selectedAssetsRef.current = initialSelectedIds;
                setSelectedAssets(initialSelectedIds);
                setSelectedAssetObjects(currentlySelected);
            } else {
                selectedAssetsRef.current = [];
                setSelectedAssets([]);
                setSelectedAssetObjects([]);
            }
        }
    }, [isOpen, currentlySelected]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedSearch(search);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [search]);

    useEffect(() => {
        selectedAssetsRef.current = selectedAssets;
    }, [selectedAssets]);

    // Keep selected asset objects synced and ordered by selectedAssets ID order.
    useEffect(() => {
        setSelectedAssetObjects((previousSelectedAssets) => {
            const assetMap = new Map<number, Asset>();

            previousSelectedAssets.forEach((asset) => assetMap.set(asset.id, asset));
            assets.data.forEach((asset) => {
                if (selectedAssets.includes(asset.id)) {
                    assetMap.set(asset.id, asset);
                }
            });

            return selectedAssets.map((assetId) => assetMap.get(assetId)).filter((asset): asset is Asset => Boolean(asset));
        });
    }, [assets.data, selectedAssets]);

    const loadAssets = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    search: debouncedSearch,
                    type: assetType !== 'all' ? assetType : '',
                    date_filter: dateFilter,
                    sort: sortOption,
                    page: String(currentPage),
                    per_page: itemsPerPage,
                    selected_ids: selectedAssetsRef.current.join(','),
                });
                const response = await fetch(`${route('assets.api.index', project.id)}?${params.toString()}`, { signal });

                if (!response.ok) {
                    throw new Error('Failed to load assets');
                }

                const data = await response.json();
                setAssets(data);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                toast.error('Failed to load assets');
            } finally {
                setLoading(false);
            }
        },
        [assetType, currentPage, dateFilter, debouncedSearch, itemsPerPage, project.id, sortOption],
    );

    // Load assets when modal opens or filters change
    useEffect(() => {
        if (isOpen) {
            const abortController = new AbortController();
            loadAssets(abortController.signal);

            return () => abortController.abort();
        }
    }, [isOpen, loadAssets]);

    const handleAssetSelect = (assetId: number) => {
        if (!allowMultiple) {
            setSelectedAssets([assetId]);
            return;
        }

        // For multiple selection, toggle the selection
        setSelectedAssets((prev) => (prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]));
    };

    const handleViewModeChange = (value: string) => {
        setViewMode(value);
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setCurrentPage(1); // Reset to first page when search changes
    };

    const handleTypeChange = (value: string) => {
        setAssetType(value);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleDateFilterChange = (value: string) => {
        setDateFilter(value);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleSortChange = (value: string) => {
        setSortOption(value);
        setCurrentPage(1); // Reset to first page when sort changes
    };

    const handleItemsPerPageChange = (value: string) => {
        setItemsPerPage(value);
        setCurrentPage(1); // Reset to first page when items per page changes
    };

    const handleClearSelection = () => {
        setSelectedAssets([]);
        setSelectedAssetObjects([]);
    };

    const handleConfirm = () => {
        // Pass the complete asset objects to the caller
        onSelect(selectedAssetObjects);
        onClose();
    };

    const handleModalClose = () => {
        onClose();
    };

    // Handle successful asset upload
    const handleAssetUploaded = () => {
        loadAssets();
        setShowUploader(false);
    };

    const confirmDeleteAsset = (asset: Asset) => {
        setAssetToDelete(asset);
        setShowDeleteDialog(true);
    };

    const handleDeleteAsset = async (asset: Asset) => {
        // Remove from selected assets if it was selected
        if (selectedAssets.includes(asset.id)) {
            setSelectedAssets(selectedAssets.filter((id) => id !== asset.id));
            setSelectedAssetObjects(selectedAssetObjects.filter((a) => a.id !== asset.id));
        }

        try {
            await axios.delete(route('assets.api.destroy', [project.id, asset.id]));
            toast.success(`Asset "${asset.original_filename}" deleted successfully`);
            loadAssets();
            setShowDeleteDialog(false);
        } catch (error) {
            console.error('Error deleting asset:', error);
            toast.error('Failed to delete asset');
            setShowDeleteDialog(false);
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleViewAssetDetails = (asset: Asset) => {
        setSelectedAssetForModal(asset);
        setShowDetailsModal(true);
    };

    const handleAssetDetailsUpdated = (updatedAsset: Asset) => {
        // Update the asset in the assets.data array
        const updatedAssets = {
            ...assets,
            data: assets.data.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)),
        };
        setAssets(updatedAssets);

        // Make sure the asset remains selected
        if (!selectedAssets.includes(updatedAsset.id)) {
            if (!allowMultiple) {
                setSelectedAssets([updatedAsset.id]);
                setSelectedAssetObjects([updatedAsset]);
            } else {
                setSelectedAssets([...selectedAssets, updatedAsset.id]);
                setSelectedAssetObjects([...selectedAssetObjects, updatedAsset]);
            }
        } else {
            // Update the asset in the selectedAssetObjects array
            setSelectedAssetObjects(selectedAssetObjects.map((a) => (a.id === updatedAsset.id ? updatedAsset : a)));
        }

        // Close the details modal
        setShowDetailsModal(false);
    };

    // Generate array of pages to show in pagination
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;

        // Always include page 1
        pageNumbers.push(1);

        // Build the page numbers array
        const startPage = Math.max(2, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(assets.last_page - 1, startPage + maxPagesToShow - 2);

        // Add ellipsis if needed after page 1
        if (startPage > 2) {
            pageNumbers.push('ellipsis-start');
        }

        // Add the visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        // Add ellipsis if needed before last page
        if (endPage < assets.last_page - 1) {
            pageNumbers.push('ellipsis-end');
        }

        // Always include the last page if there is more than one page
        if (assets.last_page > 1) {
            pageNumbers.push(assets.last_page);
        }

        return pageNumbers;
    };

    // Options for React-Select dropdowns
    const assetTypeOptions = [
        { value: 'all', label: 'All Types' },
        { value: 'image', label: 'Images' },
        { value: 'video', label: 'Videos' },
        { value: 'audio', label: 'Audio' },
        { value: 'document', label: 'Documents' },
        { value: 'other', label: 'Others' },
    ];

    const itemsPerPageOptions = [
        { value: '10', label: '10' },
        { value: '25', label: '25' },
        { value: '50', label: '50' },
        { value: '100', label: '100' },
    ];

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()} modal>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
                    <DialogHeader>
                        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <DialogTitle>Asset Library</DialogTitle>
                                <DialogDescription className="sr-only">Select assets to use in your content</DialogDescription>
                                <div className="text-muted-foreground mt-1 text-sm sm:hidden">
                                    {selectedAssets.length} {selectedAssets.length === 1 ? 'asset' : 'assets'} selected
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="text-muted-foreground hidden text-sm sm:block">
                                    {selectedAssets.length} {selectedAssets.length === 1 ? 'asset' : 'assets'} selected
                                </div>
                                {!showUploader && (
                                    <>
                                        {selectedAssets.length > 0 && (
                                            <Button variant="outline" size="icon" onClick={handleClearSelection} aria-label="Clear selection">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button variant="outline" onClick={handleModalClose}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleConfirm} disabled={selectedAssets.length === 0}>
                                            Select {selectedAssets.length > 0 ? `(${selectedAssets.length})` : ''}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {showUploader ? (
                        <AssetUploader
                            isOpen={true}
                            onClose={() => setShowUploader(false)}
                            projectId={project.id}
                            projectDisk={project.disk}
                            onUploadComplete={handleAssetUploaded}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col justify-between gap-2 md:flex-row">
                                <div className="flex flex-wrap gap-2">
                                    <SearchBar
                                        placeholder="Search assets..."
                                        className="w-full min-w-0 basis-full sm:basis-auto md:w-auto"
                                        value={search}
                                        onChange={handleSearchChange}
                                    />
                                    <MultiSelect
                                        instanceId="asset-type-select"
                                        options={assetTypeOptions}
                                        className="min-w-[140px] flex-1 sm:flex-none"
                                        isSearchable={false}
                                        value={assetTypeOptions.find((o) => o.value === assetType)}
                                        onChange={(newValue) => handleTypeChange((newValue as SelectOption | null)?.value ?? 'all')}
                                    />

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full sm:w-[140px]">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {dateFilter ? getDateFilterDisplay(dateFilter) : 'Date Filter'}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            <DropdownMenuRadioGroup value={dateFilter} onValueChange={handleDateFilterChange}>
                                                <DropdownMenuRadioItem value="">All Time</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="today">Today</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="week">Last 7 days</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="month">Last 30 days</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="quarter">Last 90 days</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full sm:w-[140px]">
                                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                                {getSortOptionDisplay(sortOption)}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuRadioGroup value={sortOption} onValueChange={handleSortChange}>
                                                <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="oldest">Oldest</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                                                <DropdownMenuRadioItem value="size">Size</DropdownMenuRadioItem>
                                            </DropdownMenuRadioGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" className="px-3" onClick={() => setShowUploader(!showUploader)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Upload
                                    </Button>

                                    <Tabs value={viewMode} onValueChange={handleViewModeChange} className="hidden md:flex">
                                        <TabsList>
                                            <TabsTrigger value="grid" className="px-3">
                                                <LayoutGrid className="h-4 w-4" />
                                            </TabsTrigger>
                                            <TabsTrigger value="list" className="px-3">
                                                <List className="h-4 w-4" />
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex h-64 items-center justify-center">
                                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                                </div>
                            ) : (
                                <>
                                    {viewMode === 'grid' && (
                                        <AssetGrid
                                            assets={assets.data}
                                            selectedAssets={selectedAssets}
                                            onAssetSelect={handleAssetSelect}
                                            onViewDetails={handleViewAssetDetails}
                                            onDelete={confirmDeleteAsset}
                                        />
                                    )}

                                    {viewMode === 'list' && (
                                        <AssetTable
                                            assets={assets.data}
                                            selectedAssets={selectedAssets}
                                            onAssetSelect={handleAssetSelect}
                                            onViewDetails={handleViewAssetDetails}
                                            onDelete={confirmDeleteAsset}
                                        />
                                    )}

                                    {/* Pagination */}
                                    {assets.last_page > 1 && (
                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0 overflow-x-auto pb-1">
                                                <Pagination className="justify-start">
                                                    <PaginationContent>
                                                        <PaginationItem>
                                                            <PaginationPrevious
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (currentPage > 1) handlePageChange(currentPage - 1);
                                                                }}
                                                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                            />
                                                        </PaginationItem>

                                                        {getPageNumbers().map((page) =>
                                                            typeof page === 'string' ? (
                                                                <PaginationItem key={page}>
                                                                    <PaginationEllipsis />
                                                                </PaginationItem>
                                                            ) : (
                                                                <PaginationItem key={page}>
                                                                    <PaginationLink
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            handlePageChange(page as number);
                                                                        }}
                                                                        isActive={currentPage === page}
                                                                    >
                                                                        {page}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            ),
                                                        )}

                                                        <PaginationItem>
                                                            <PaginationNext
                                                                href="#"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    if (currentPage < assets.last_page) handlePageChange(currentPage + 1);
                                                                }}
                                                                className={currentPage === assets.last_page ? 'pointer-events-none opacity-50' : ''}
                                                            />
                                                        </PaginationItem>
                                                    </PaginationContent>
                                                </Pagination>
                                            </div>
                                            <div className="mb-4 flex flex-wrap items-center gap-2 sm:justify-end">
                                                <span className="text-muted-foreground text-sm">Items per page:</span>
                                                <MultiSelect
                                                    instanceId="items-per-page-select"
                                                    options={itemsPerPageOptions}
                                                    className="h-8 w-[70px]"
                                                    isSearchable={false}
                                                    value={itemsPerPageOptions.find((o) => o.value === itemsPerPage)}
                                                    onChange={(newValue) =>
                                                        handleItemsPerPageChange((newValue as SelectOption | null)?.value ?? '10')
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Asset Details Modal */}
            {selectedAssetForModal && (
                <AssetDetailsModal
                    isOpen={showDetailsModal}
                    onClose={() => setShowDetailsModal(false)}
                    project={project}
                    asset={selectedAssetForModal}
                    onUpdate={handleAssetDetailsUpdated}
                />
            )}

            {/* Confirm Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this asset?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the asset "{assetToDelete?.original_filename}" and remove it
                            from any content that uses it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => assetToDelete && handleDeleteAsset(assetToDelete)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// Helper functions
function getDateFilterDisplay(filter: string) {
    switch (filter) {
        case 'today':
            return 'Today';
        case 'week':
            return 'Last 7 days';
        case 'month':
            return 'Last 30 days';
        case 'quarter':
            return 'Last 90 days';
        default:
            return 'Date Filter';
    }
}

function getSortOptionDisplay(option: string) {
    switch (option) {
        case 'newest':
            return 'Newest';
        case 'oldest':
            return 'Oldest';
        case 'name':
            return 'Name';
        case 'size':
            return 'Size';
        default:
            return 'Sort';
    }
}
