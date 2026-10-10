import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Asset, BreadcrumbItem, Project, UserCan } from '@/types';

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
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AssetGrid from '@/pages/admin/Assets/AssetGrid';
import AssetTable from '@/pages/admin/Assets/AssetTable';
import AssetUploader from '@/pages/admin/Assets/AssetUploader';
import { ArrowUpDown, Calendar, Filter, LayoutGrid, List, Plus, Trash, X } from 'lucide-react';

import ProjectsLayout from '../Projects/layout';
import AssetDetailsModal from './AssetDetailsModal';

interface Props {
    project: Project;
    assets: {
        data: Asset[];
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
        from: number;
        to: number;
    };
    filters: {
        search?: string;
        type?: string;
        date_filter?: string;
        date_from?: string;
        date_to?: string;
        sort?: string;
        per_page?: string;
    };
}

const DEFAULT_SORT = 'newest';

export default function Index({ project, assets, filters }: Props) {
    const [showUploader, setShowUploader] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
    const [search, setSearch] = useState('');
    const [assetType, setAssetType] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    const [viewMode, setViewMode] = useState('grid');
    const [sortOption, setSortOption] = useState(DEFAULT_SORT);
    const [selectedAssetForModal, setSelectedAssetForModal] = useState<Asset | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [assetsState, setAssets] = useState(assets);
    const searchDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const page = usePage<{ can?: Record<string, boolean> }>();
    const can = page.props.userCan as UserCan;

    // Set all state values after component is mounted
    useEffect(() => {
        if (filters) {
            // Set values only if they exist in filters
            if (typeof filters.search === 'string') setSearch(filters.search);
            if (typeof filters.type === 'string') setAssetType(filters.type);
            if (typeof filters.date_filter === 'string') setDateFilter(filters.date_filter);
            if (typeof filters.sort === 'string') setSortOption(filters.sort);
        }

        // Load view mode from localStorage
        try {
            const savedViewMode = localStorage.getItem('assetViewMode');
            if (savedViewMode === 'grid' || savedViewMode === 'list') {
                setViewMode(savedViewMode);
            }
        } catch (e) {
            console.error('Error loading view mode from localStorage:', e);
        }

        setAssets(assets);
    }, [filters, assets]);

    // Save view mode to localStorage when it changes
    const handleViewModeChange = (value: string) => {
        setViewMode(value);
        localStorage.setItem('assetViewMode', value);
    };

    const buildAssetQueryParams = (updates: {
        search?: string;
        type?: string;
        dateFilter?: string;
        sort?: string;
        perPage?: string;
        page?: number;
    }) => {
        return {
            search: updates.search ?? search,
            type: (updates.type ?? assetType) === 'all' ? '' : (updates.type ?? assetType),
            date_filter: updates.dateFilter ?? dateFilter,
            sort: updates.sort ?? sortOption,
            per_page: updates.perPage ?? filters.per_page ?? assetsState.per_page?.toString() ?? '10',
            page: updates.page,
        };
    };

    const applyFilters = (updates: { search?: string; type?: string; dateFilter?: string; sort?: string; perPage?: string; page?: number }) => {
        if (updates.search !== undefined) setSearch(updates.search);
        if (updates.type !== undefined) setAssetType(updates.type);
        if (updates.dateFilter !== undefined) setDateFilter(updates.dateFilter);
        if (updates.sort !== undefined) setSortOption(updates.sort);

        const queryParams = buildAssetQueryParams(updates);

        // Clear selected assets when filters change
        setSelectedAssets([]);

        // Apply filters
        router.get(route('assets.index', project.id), queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    useEffect(() => {
        if (search === (filters.search ?? '')) {
            return;
        }

        if (searchDebounceTimeoutRef.current) {
            clearTimeout(searchDebounceTimeoutRef.current);
        }

        searchDebounceTimeoutRef.current = setTimeout(() => {
            applyFilters({ search, page: 1 });
        }, 400);

        return () => {
            if (searchDebounceTimeoutRef.current) {
                clearTimeout(searchDebounceTimeoutRef.current);
            }
        };
    }, [search]);

    const handleTypeChange = (value: string) => {
        applyFilters({ type: value, page: 1 });
    };

    const handleDateFilterChange = (value: string) => {
        applyFilters({ dateFilter: value, page: 1 });
    };

    const handleSortChange = (value: string) => {
        applyFilters({ sort: value, page: 1 });
    };

    const handlePageChange = (page: number) => {
        // Clear selected assets when changing pages
        setSelectedAssets([]);

        router.get(route('assets.index', project.id), buildAssetQueryParams({ page }), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleAssetSelect = (assetId: number) => {
        if (!assetId) return;

        if (selectedAssets.includes(assetId)) {
            setSelectedAssets(selectedAssets.filter((id) => id !== assetId));
        } else {
            setSelectedAssets([...selectedAssets, assetId]);
        }
    };

    const handleSelectAll = () => {
        if (!assets?.data) return;

        if (selectedAssets.length === assets.data.length) {
            setSelectedAssets([]);
        } else {
            setSelectedAssets(assets.data.map((asset) => asset.id));
        }
    };

    const handleBulkDelete = () => {
        if (selectedAssets.length === 0) return;

        router.post(
            route('assets.bulk-destroy', project.id),
            {
                asset_ids: selectedAssets,
            },
            {
                onSuccess: () => {
                    setSelectedAssets([]);
                    setShowBulkDeleteDialog(false);
                    const count = selectedAssets.length;
                    toast.success(`${count} ${count === 1 ? 'asset' : 'assets'} deleted successfully`);
                    applyFilters({
                        search: search,
                        type: assetType,
                        dateFilter: dateFilter,
                    });
                },
                onError: () => {
                    toast.error('Failed to delete assets');
                },
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleDeleteAsset = (asset: Asset) => {
        setAssetToDelete(asset);
    };

    const confirmDeleteAsset = () => {
        if (!assetToDelete) return;

        router.delete(route('assets.destroy', [project.id, assetToDelete.id]), {
            onSuccess: () => {
                toast.success(`Asset "${assetToDelete.original_filename}" deleted successfully`);
                setAssetToDelete(null);
                applyFilters({
                    search: search,
                    type: assetType,
                    dateFilter: dateFilter,
                });
            },
            onError: () => {
                toast.error('Failed to delete asset');
                setAssetToDelete(null);
            },
            preserveState: true,
            replace: true,
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: project.name,
            href: route('projects.show', project.id),
        },
        {
            title: 'Asset Library',
            href: route('assets.index', project.id),
        },
    ];

    // Display formatted date filter for the button
    const getDateFilterDisplay = () => {
        if (dateFilter === 'today') return 'Today';
        if (dateFilter === 'week') return 'Last 7 days';
        if (dateFilter === 'month') return 'Last 30 days';
        if (dateFilter === 'quarter') return 'Last 90 days';
        return 'Date Filter';
    };

    const handleViewAssetDetails = (asset: Asset) => {
        setSelectedAssetForModal(asset);
        setShowDetailsModal(true);
    };

    const currentModalAssetIndex = selectedAssetForModal ? assetsState.data.findIndex((asset) => asset.id === selectedAssetForModal.id) : -1;
    const canNavigatePrev = currentModalAssetIndex > 0;
    const canNavigateNext = currentModalAssetIndex >= 0 && currentModalAssetIndex < assetsState.data.length - 1;

    const handleModalNavigate = (direction: 'prev' | 'next') => {
        if (currentModalAssetIndex === -1) {
            return;
        }

        const nextIndex = direction === 'prev' ? currentModalAssetIndex - 1 : currentModalAssetIndex + 1;
        if (nextIndex >= 0 && nextIndex < assetsState.data.length) {
            setSelectedAssetForModal(assetsState.data[nextIndex]);
        }
    };

    const handleClearSelection = () => {
        setSelectedAssets([]);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Asset Library" />

            <ProjectsLayout>
                <div className="min-w-0 flex-1">
                    <section className="space-y-6">
                        <div>
                            <Tabs defaultValue="grid" value={viewMode} onValueChange={handleViewModeChange}>
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-lg font-semibold">Asset Library</h3>
                                    {can.upload_asset && (
                                        <Button onClick={() => setShowUploader(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Upload Asset
                                        </Button>
                                    )}
                                </div>

                                <div className="mb-2 flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        {can.delete_asset && (
                                            <div className="flex shrink-0 items-center rounded-md border p-2">
                                                <Checkbox
                                                    checked={selectedAssets.length > 0 && selectedAssets.length === assets.data.length}
                                                    onCheckedChange={handleSelectAll}
                                                    id="select-all"
                                                    className="h-5 w-5"
                                                />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <SearchBar value={search} onChange={handleSearchChange} placeholder="Search assets..." className="w-full" />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select value={assetType} onValueChange={handleTypeChange}>
                                            <SelectTrigger className="w-full sm:w-[160px]">
                                                <div className="flex items-center gap-2">
                                                    <Filter className="h-4 w-4 shrink-0" />
                                                    <SelectValue placeholder="Filter by type" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All types</SelectItem>
                                                <SelectItem value="image">Images</SelectItem>
                                                <SelectItem value="video">Videos</SelectItem>
                                                <SelectItem value="audio">Audio</SelectItem>
                                                <SelectItem value="document">Documents</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="flex w-full items-center gap-2 sm:w-auto">
                                                    <Calendar className="h-4 w-4 shrink-0" />
                                                    {getDateFilterDisplay()}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-40">
                                                <DropdownMenuLabel>Filter by date</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuRadioGroup value={dateFilter} onValueChange={handleDateFilterChange}>
                                                    <DropdownMenuRadioItem value="">All time</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="today">Today</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="week">Last 7 days</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="month">Last 30 days</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="quarter">Last 90 days</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="flex w-full items-center gap-2 sm:w-auto">
                                                    <ArrowUpDown className="h-4 w-4 shrink-0" />
                                                    {sortOption === 'newest' && 'Newest first'}
                                                    {sortOption === 'oldest' && 'Oldest first'}
                                                    {sortOption === 'name_asc' && 'Name A-Z'}
                                                    {sortOption === 'name_desc' && 'Name Z-A'}
                                                    {sortOption === 'size_asc' && 'Size (smallest)'}
                                                    {sortOption === 'size_desc' && 'Size (largest)'}
                                                    {!sortOption && 'Sort by'}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-40">
                                                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuRadioGroup value={sortOption} onValueChange={handleSortChange}>
                                                    <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="name_asc">Name A-Z</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="name_desc">Name Z-A</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="size_asc">Size (smallest)</DropdownMenuRadioItem>
                                                    <DropdownMenuRadioItem value="size_desc">Size (largest)</DropdownMenuRadioItem>
                                                </DropdownMenuRadioGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <TabsList>
                                            <TabsTrigger value="grid" aria-label="Grid View">
                                                <LayoutGrid className="h-4 w-4" />
                                            </TabsTrigger>
                                            <TabsTrigger value="list" aria-label="List View">
                                                <List className="h-4 w-4" />
                                            </TabsTrigger>
                                        </TabsList>

                                        {selectedAssets.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{selectedAssets.length} selected</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="icon" onClick={handleClearSelection}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Clear selection</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                {can.delete_asset && (
                                                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteDialog(true)}>
                                                        <Trash className="mr-1 h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <TabsContent value="grid">
                                    {assetsState.data.length > 0 ? (
                                        <AssetGrid
                                            assets={assetsState.data}
                                            selectedAssets={selectedAssets}
                                            onAssetSelect={handleAssetSelect}
                                            onViewDetails={handleViewAssetDetails}
                                            onDelete={handleDeleteAsset}
                                        />
                                    ) : (
                                        <div className="text-muted-foreground py-12 text-center">No assets found</div>
                                    )}
                                </TabsContent>

                                <TabsContent value="list">
                                    {assetsState.data.length > 0 ? (
                                        <AssetTable
                                            assets={assetsState.data}
                                            selectedAssets={selectedAssets}
                                            onAssetSelect={handleAssetSelect}
                                            onViewDetails={handleViewAssetDetails}
                                            onDelete={handleDeleteAsset}
                                        />
                                    ) : (
                                        <div className="text-muted-foreground py-12 text-center">No assets found</div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            {/* Pagination section */}
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 overflow-x-auto pb-1">
                                    {assetsState && assetsState.last_page > 1 && (
                                        <Pagination className="justify-start">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePageChange(assetsState.current_page - 1);
                                                        }}
                                                        aria-disabled={assetsState.current_page === 1}
                                                        className={assetsState.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                                    />
                                                </PaginationItem>

                                                {/* First page */}
                                                <PaginationItem>
                                                    <PaginationLink
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePageChange(1);
                                                        }}
                                                        isActive={assetsState.current_page === 1}
                                                    >
                                                        1
                                                    </PaginationLink>
                                                </PaginationItem>

                                                {/* If there are many pages, show ellipsis after first page */}
                                                {assetsState.current_page > 3 && (
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                )}

                                                {/* Page before current if not first page or adjacent to first */}
                                                {assetsState.current_page > 2 && (
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handlePageChange(assetsState.current_page - 1);
                                                            }}
                                                        >
                                                            {assetsState.current_page - 1}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )}

                                                {/* Current page if not first or last */}
                                                {assetsState.current_page !== 1 && assetsState.current_page !== assetsState.last_page && (
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handlePageChange(assetsState.current_page);
                                                            }}
                                                            isActive
                                                        >
                                                            {assetsState.current_page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )}

                                                {/* Page after current if not last page or adjacent to last */}
                                                {assetsState.current_page < assetsState.last_page - 1 && (
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handlePageChange(assetsState.current_page + 1);
                                                            }}
                                                        >
                                                            {assetsState.current_page + 1}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )}

                                                {/* If there are many pages, show ellipsis before last page */}
                                                {assetsState.current_page < assetsState.last_page - 2 && (
                                                    <PaginationItem>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                )}

                                                {/* Last page if not the same as first page */}
                                                {assetsState.last_page > 1 && (
                                                    <PaginationItem>
                                                        <PaginationLink
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handlePageChange(assetsState.last_page);
                                                            }}
                                                            isActive={assetsState.current_page === assetsState.last_page}
                                                        >
                                                            {assetsState.last_page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePageChange(assetsState.current_page + 1);
                                                        }}
                                                        aria-disabled={assetsState.current_page === assetsState.last_page}
                                                        className={
                                                            assetsState.current_page === assetsState.last_page ? 'pointer-events-none opacity-50' : ''
                                                        }
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    )}
                                </div>
                                {assetsState.total > 0 && (
                                    <div className="mb-4 flex flex-wrap items-center gap-2 sm:justify-end">
                                        <div className="text-muted-foreground text-sm">
                                            Showing <span className="font-semibold">{assetsState.from}</span> to{' '}
                                            <span className="font-semibold">{assetsState.to}</span> of{' '}
                                            <span className="font-semibold">{assetsState.total}</span> assets
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-sm">Per page:</span>
                                            <Select
                                                value={(filters.per_page || '10').toString()}
                                                onValueChange={(value) => {
                                                    // Clear selected assets when changing page size
                                                    setSelectedAssets([]);

                                                    applyFilters({ perPage: value, page: 1 });
                                                }}
                                            >
                                                <SelectTrigger className="h-8 w-[80px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                    <SelectItem value="100">100</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </ProjectsLayout>

            <AssetUploader
                isOpen={showUploader}
                onClose={() => setShowUploader(false)}
                projectId={project.id}
                projectDisk={project.disk}
                onUploadComplete={() => {
                    applyFilters({
                        search: search,
                        type: assetType,
                        dateFilter: dateFilter,
                    });
                }}
            />

            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Assets</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedAssets.length} {selectedAssets.length === 1 ? 'asset' : 'assets'}? This action
                            cannot be undone and the files will be permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{assetToDelete?.original_filename}"? This action cannot be undone and the file will be
                            permanently removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteAsset}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {selectedAssetForModal && (
                <AssetDetailsModal
                    isOpen={showDetailsModal}
                    onClose={() => setShowDetailsModal(false)}
                    project={project}
                    asset={selectedAssetForModal}
                    onNavigate={handleModalNavigate}
                    canNavigatePrev={canNavigatePrev}
                    canNavigateNext={canNavigateNext}
                />
            )}
        </AppLayout>
    );
}
