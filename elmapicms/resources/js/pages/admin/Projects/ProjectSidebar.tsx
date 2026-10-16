import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

import { Project, SharedData, Collection, UserCan } from '@/types/index.d';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FolderTree, Plus, Settings, GripVertical, MoreVertical } from 'lucide-react';
import { SearchBar } from '@/components/ui/search-bar';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import CreateCollectionModal from '@/pages/admin/Collections/CreateCollectionModal';
import DeleteCollectionModal from '@/pages/admin/Collections/DeleteCollectionModal';

interface Props {
    project: Project;
}

export default function ProjectSidebar({ project }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [collections, setCollections] = useState(project.collections ?? []);
    const page = usePage<SharedData>();
    const can = page.props.userCan as UserCan;
    const { collection } = page.props as { collection?: Collection };

    useEffect(() => {
        setCollections(project.collections ?? []);
    }, [project.collections]);

    const isEditPage = page.component === 'Collections/Edit';

    const isCollectionActive = (collectionId: number) => {
        if (page.component === 'Collections/Show' || page.component === 'Collections/Edit') {
            return collection?.id === collectionId;
        }

        // Extract pathname from both URLs (route() may return full URL with domain)
        const getPathname = (url: string) => {
            try { return new URL(url).pathname; } catch { return url; }
        };
        const urlPath = getPathname(page.url).split('?')[0].split('#')[0].replace(/\/+$/, '');
        const collectionUrl = getPathname(route('projects.collections.show', [project.id, collectionId])).replace(/\/+$/, '');
        return urlPath === collectionUrl || urlPath.startsWith(collectionUrl + '/');
    };

    const filteredCollections = collections.filter(
        (item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.slug.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(collections);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setCollections(items);

        try {
            await axios.post(route('projects.collections.reorder', project.id), {
                collections: items.map((item, index) => ({
                    id: item.id,
                    order: index,
                })),
            });
        } catch (error) {
            console.error('Failed to update collection order:', error);
            setCollections(project.collections ?? []);
        }
    };

    const openCreateModal = () => {
        setIsMobileSheetOpen(false);
        setIsCreateModalOpen(true);
    };

    const collectionsNav = (droppableId: string, onNavigate?: () => void) => (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pr-8">
                <h3 className="text-sm font-medium">Collections</h3>
                {can.create_collection && (
                    <Button variant="default" size="sm" className="h-6 px-1 text-xs" onClick={openCreateModal}>
                        <Plus className="mr-1" />
                        Add New
                    </Button>
                )}
            </div>

            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search collections..." className="px-1" />

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={droppableId}>
                    {(provided: DroppableProvided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                            {filteredCollections.map((item, index) => (
                                <Draggable key={item.id} draggableId={`${droppableId}-${item.id}`} index={index} isDragDisabled={!isEditPage}>
                                    {(provided: DraggableProvided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center space-x-2">
                                            {isEditPage && (
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="text-muted-foreground hover:text-foreground cursor-grab p-2"
                                                >
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                            )}
                                            <Link
                                                href={route('projects.collections.show', [project.id, item.id])}
                                                onClick={onNavigate}
                                                className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex-1 rounded-md p-2 text-sm transition-colors ${
                                                    isCollectionActive(item.id) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                                                }`}
                                            >
                                                {item.name}
                                            </Link>
                                            {can.access_collection_settings && (
                                                <Link
                                                    href={route('projects.collections.edit', [project.id, item.id])}
                                                    onClick={onNavigate}
                                                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground block rounded-md p-2 text-xs transition-colors"
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </Link>
                                            )}
                                            {isEditPage && (can.update_collection || can.delete_collection) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground block rounded-md p-2 text-xs transition-colors">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {can.update_collection && (
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedCollection(item);
                                                                    setIsMobileSheetOpen(false);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                            >
                                                                Edit Collection
                                                            </DropdownMenuItem>
                                                        )}
                                                        {can.delete_collection && (
                                                            <DropdownMenuItem
                                                                className="text-destructive cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedCollection(item);
                                                                    setIsMobileSheetOpen(false);
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                            >
                                                                Delete Collection
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                            {filteredCollections.length === 0 && (
                                <p className="text-muted-foreground px-2 text-xs">
                                    {searchQuery ? 'No collections found' : 'No collections yet'}
                                </p>
                            )}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );

    return (
        <>
            <div className="mb-4 lg:hidden">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsMobileSheetOpen(true)}>
                    <FolderTree className="h-4 w-4" />
                    Collections
                </Button>

                <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
                    <SheetContent side="left" className="w-[300px] overflow-y-auto p-4 sm:max-w-sm">
                        <SheetHeader className="sr-only">
                            <SheetTitle>Collections</SheetTitle>
                            <SheetDescription>Browse and manage project collections</SheetDescription>
                        </SheetHeader>
                        {collectionsNav('mobile-collections', () => setIsMobileSheetOpen(false))}
                    </SheetContent>
                </Sheet>
            </div>

            <div className="hidden lg:block">
                <aside className="sticky top-0 w-full shrink-0 space-y-4 lg:w-56">{collectionsNav('desktop-collections')}</aside>
            </div>

            <CreateCollectionModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} projectId={project.id} />

            <CreateCollectionModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                projectId={project.id}
                collection={selectedCollection}
            />

            {selectedCollection && (
                <DeleteCollectionModal
                    open={isDeleteModalOpen}
                    onOpenChange={setIsDeleteModalOpen}
                    projectId={project.id}
                    collection={selectedCollection}
                />
            )}
        </>
    );
}
