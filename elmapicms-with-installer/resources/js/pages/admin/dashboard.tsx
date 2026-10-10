import { useState, useMemo, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

import { type BreadcrumbItem, type Project, type UserCan } from '@/types/index.d';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchBar } from '@/components/ui/search-bar';
import { formatLocalDateTime, formatRelativeFromNow, getDateTimestamp } from '@/lib/date';

import CreateProjectModal from '@/pages/admin/Projects/CreateProjectModal';

import {
    Plus,
    LayoutGrid,
    List,
    FolderOpen,
    Image,
    FileText,
    Globe,
    ArrowUpDown,
    Clock,
    Zap,
    Database,
    ExternalLink,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
    },
];

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';
type ViewMode = 'grid' | 'list';

const VIEW_MODE_STORAGE_KEY = 'dashboardProjectViewMode';
const SORT_BY_STORAGE_KEY = 'dashboardProjectSortBy';
const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'name-asc', 'name-desc'];

function isViewMode(value: string | null): value is ViewMode {
    return value === 'grid' || value === 'list';
}

function isSortOption(value: string | null): value is SortOption {
    return value !== null && SORT_OPTIONS.includes(value as SortOption);
}

const PROJECT_COLORS = [
    'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
    'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
    'bg-teal-500/15 text-teal-700 dark:text-teal-400',
    'bg-pink-500/15 text-pink-700 dark:text-pink-400',
];

function getProjectColor(id: number) {
    return PROJECT_COLORS[id % PROJECT_COLORS.length];
}

function getInitials(name: string) {
    return name
        .split(/[\s-_]+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');
}

function formatPreviewUrlLabel(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.host + (parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : '');
    } catch {
        return url;
    }
}

interface Props {
    projects: Project[];
}

export default function Dashboard({ projects }: Props) {
    const can = usePage().props.userCan as UserCan;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    useEffect(() => {
        try {
            const savedViewMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
            if (isViewMode(savedViewMode)) {
                setViewMode(savedViewMode);
            }

            const savedSortBy = localStorage.getItem(SORT_BY_STORAGE_KEY);
            if (isSortOption(savedSortBy)) {
                setSortBy(savedSortBy);
            }
        } catch (error) {
            console.error('Error loading dashboard project preferences from localStorage:', error);
        }
    }, []);

    const filteredAndSorted = useMemo(() => {
        let result = projects.filter(
            (project) =>
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
                (project.preview_url?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
        );

        result = [...result].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return getDateTimestamp(b.updated_at) - getDateTimestamp(a.updated_at);
                case 'oldest':
                    return getDateTimestamp(a.updated_at) - getDateTimestamp(b.updated_at);
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });

        return result;
    }, [projects, searchQuery, sortBy]);

    const handleViewModeChange = (value: string) => {
        if (!isViewMode(value)) {
            return;
        }

        setViewMode(value);

        try {
            localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
        } catch (error) {
            console.error('Error saving dashboard view mode to localStorage:', error);
        }
    };

    const cycleSortOption = () => {
        const currentIndex = SORT_OPTIONS.indexOf(sortBy);
        const nextSortBy = SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length];
        setSortBy(nextSortBy);

        try {
            localStorage.setItem(SORT_BY_STORAGE_KEY, nextSortBy);
        } catch (error) {
            console.error('Error saving dashboard sort preference to localStorage:', error);
        }
    };

    const sortLabel: Record<SortOption, string> = {
        newest: 'Newest first',
        oldest: 'Oldest first',
        'name-asc': 'A \u2192 Z',
        'name-desc': 'Z \u2192 A',
    };

    const totalCollections = projects.reduce((sum, p) => sum + (p.collections_count ?? 0), 0);
    const totalAssets = projects.reduce((sum, p) => sum + (p.assets_count ?? 0), 0);
    const totalContent = projects.reduce((sum, p) => sum + (p.content_count ?? 0), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 rounded-xl">
                {/* Stats overview */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                            <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-semibold leading-none">{projects.length}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Projects</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                            <FolderOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-semibold leading-none">{totalCollections}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Collections</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                            <Image className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-semibold leading-none">{totalAssets}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Assets</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-2xl font-semibold leading-none">{totalContent}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Entries</p>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-center gap-2">
                        <div className="max-w-sm flex-1">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search projects..."
                                className="[&_input]:border-sidebar-border/70 [&_input]:bg-sidebar [&_input]:text-sidebar-foreground [&_input]:placeholder:text-sidebar-foreground/70"
                            />
                        </div>
                        {searchQuery && (
                            <span className="whitespace-nowrap text-sm text-muted-foreground">
                                {filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={cycleSortOption}
                                    className="gap-1.5 border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                >
                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{sortLabel[sortBy]}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Sort projects</TooltipContent>
                        </Tooltip>

                        <ToggleGroup
                            type="single"
                            value={viewMode}
                            onValueChange={handleViewModeChange}
                            variant="outline"
                            size="sm"
                            className="border-sidebar-border/70 bg-sidebar"
                        >
                            <ToggleGroupItem
                                value="grid"
                                aria-label="Grid view"
                                className="border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=on]:bg-sidebar-accent data-[state=on]:text-sidebar-accent-foreground"
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="list"
                                aria-label="List view"
                                className="border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=on]:bg-sidebar-accent data-[state=on]:text-sidebar-accent-foreground"
                            >
                                <List className="h-3.5 w-3.5" />
                            </ToggleGroupItem>
                        </ToggleGroup>

                        {can.create_project && (
                            <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">New Project</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Project listing */}
                {filteredAndSorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sidebar-border/70 py-20">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <FolderOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">
                            {searchQuery ? 'No projects found' : 'No projects yet'}
                        </h3>
                        <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? `No projects match "${searchQuery}". Try a different search term.`
                                : 'Create your first project to start managing your content.'}
                        </p>
                        {!searchQuery && can.create_project && (
                            <Button className="mt-6 gap-2" onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="h-4 w-4" />
                                Create Project
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredAndSorted.map((project) => (
                            <Card
                                key={project.id}
                                className="group cursor-pointer gap-0 overflow-hidden border-sidebar-border/70 bg-sidebar py-0 transition-all hover:border-primary/40 hover:shadow-md dark:border-sidebar-border dark:hover:border-primary/40"
                                onClick={() => router.visit(route('projects.show', project.id))}
                            >
                                {/* Color bar + initials header */}
                                <div className="flex items-center gap-3 px-4 pt-4">
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${getProjectColor(project.id)}`}
                                    >
                                        {getInitials(project.name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="truncate text-sm transition-colors group-hover:text-sidebar-accent-foreground">
                                            {project.name}
                                        </CardTitle>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground transition-colors group-hover:text-sidebar-accent-foreground/80">
                                            {project.description || 'No description'}
                                        </p>
                                        {project.preview_url && (
                                            <a
                                                href={project.preview_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary underline-offset-2 hover:underline"
                                            >
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{formatPreviewUrlLabel(project.preview_url)}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <CardContent className="px-4 pb-0 pt-3">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex items-center gap-1">
                                                    <FolderOpen className="h-3 w-3" />
                                                    {project.collections_count ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Collections</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex items-center gap-1">
                                                    <Image className="h-3 w-3" />
                                                    {project.assets_count ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Assets</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    {project.content_count ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Content entries</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </CardContent>

                                {/* Footer */}
                                <CardFooter className="flex items-center justify-between border-t px-4 py-2.5 mt-3">
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="gap-1 border-sidebar-border/60 bg-sidebar-accent/40 px-1.5 py-0 text-[10px] font-normal text-sidebar-foreground">
                                            <Globe className="h-2.5 w-2.5" />
                                            {project.default_locale}
                                        </Badge>
                                        {project.public_api && (
                                            <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                                <Zap className="h-2.5 w-2.5" />
                                                Public
                                            </Badge>
                                        )}
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="h-2.5 w-2.5" />
                                                {formatRelativeFromNow(project.updated_at)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Last updated: {formatLocalDateTime(project.updated_at, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </TooltipContent>
                                    </Tooltip>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    /* List view */
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <div className="divide-y">
                            {filteredAndSorted.map((project) => (
                                <div
                                    key={project.id}
                                    className="group flex cursor-pointer items-center gap-4 bg-sidebar px-4 py-3 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                    onClick={() => router.visit(route('projects.show', project.id))}
                                >
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${getProjectColor(project.id)}`}
                                    >
                                        {getInitials(project.name)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium transition-colors group-hover:text-sidebar-accent-foreground">
                                            {project.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground transition-colors group-hover:text-sidebar-accent-foreground/80">
                                            {project.description || 'No description'}
                                        </p>
                                        {project.preview_url && (
                                            <a
                                                href={project.preview_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary underline-offset-2 hover:underline"
                                            >
                                                <ExternalLink className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{formatPreviewUrlLabel(project.preview_url)}</span>
                                            </a>
                                        )}
                                    </div>

                                    <div className="hidden items-center gap-5 text-xs text-muted-foreground transition-colors group-hover:text-sidebar-accent-foreground/80 md:flex">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex items-center gap-1.5 tabular-nums">
                                                    <FolderOpen className="h-3.5 w-3.5" />
                                                    {project.collections_count ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Collections</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex items-center gap-1.5 tabular-nums">
                                                    <Image className="h-3.5 w-3.5" />
                                                    {project.assets_count ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Assets</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="flex items-center gap-1.5 tabular-nums">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    {project.content_count ?? 0}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>Content entries</TooltipContent>
                                        </Tooltip>
                                    </div>

                                    <div className="hidden items-center gap-1.5 sm:flex">
                                        <Badge variant="outline" className="gap-1 border-sidebar-border/60 bg-sidebar-accent/40 px-1.5 py-0 text-[10px] font-normal text-sidebar-foreground">
                                            <Globe className="h-2.5 w-2.5" />
                                            {project.default_locale}
                                        </Badge>
                                        {project.public_api && (
                                            <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                                <Zap className="h-2.5 w-2.5" />
                                                Public
                                            </Badge>
                                        )}
                                    </div>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="hidden shrink-0 items-center gap-1 text-[11px] text-muted-foreground transition-colors group-hover:text-sidebar-accent-foreground/80 sm:flex">
                                                <Clock className="h-3 w-3" />
                                                {formatRelativeFromNow(project.updated_at)}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Last updated: {formatLocalDateTime(project.updated_at, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <CreateProjectModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </AppLayout>
    );
}
