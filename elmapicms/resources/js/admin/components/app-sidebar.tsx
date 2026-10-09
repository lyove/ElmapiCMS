import { NavMain } from '@/admin/components/nav-main';
import { NavUser } from '@/admin/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel } from '@/admin/components/ui/sidebar';
import { type NavItem, SharedData, Project, UserCan } from '@/admin/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Settings, Image, Users, Folder, Sparkles } from 'lucide-react';
import AppLogo from './app-logo';
import { Separator } from '@radix-ui/react-separator';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutGrid,
    }
];

/** Extract pathname from a URL string (handles both full URLs and relative paths) */
function getPathname(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

/** Check if the current URL matches a given href with proper path boundary handling */
function isUrlActive(currentUrl: string, href: string, exact = false): boolean {
    const urlPath = getPathname(currentUrl).split('?')[0].split('#')[0].replace(/\/+$/, '');
    const hrefPath = getPathname(href).split('?')[0].split('#')[0].replace(/\/+$/, '');
    if (urlPath === hrefPath) return true;
    if (!exact && urlPath.startsWith(hrefPath + '/')) return true;
    return false;
}

export function AppSidebar() {
    const page = usePage<SharedData>();
    const currentProject = page.props.project as Project | undefined;
    
    const can = usePage().props.userCan as UserCan;

    // Generate project menu items if we're on a project page
    const projectMenuItems: (NavItem & { permission?: string; matchPaths?: string[] })[] = currentProject ? [
        {
            title: 'Collections',
            href: route('projects.show', currentProject.id),
            icon: Folder,
            matchPaths: [`/admin/projects/${currentProject.id}/collections`],
        },
        {
            title: 'Asset Management',
            href: route('assets.index', currentProject.id),
            icon: Image,
            permission: 'access_assets',
        },
        {
            title: 'Settings',
            href: route('projects.settings.project', currentProject.id),
            icon: Settings,
            permission: 'access_project_settings',
        },
    ] : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/admin">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                
                {currentProject && (
                    <SidebarGroup className="px-2 py-0 mt-6">
                        <SidebarGroupLabel>{currentProject.name}</SidebarGroupLabel>
                        <SidebarMenu>
                            {projectMenuItems
                                .filter(item => !item.permission || can[item.permission])
                                .map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton  
                                        asChild
                                        isActive={(() => {
                                            const urlPath = getPathname(page.url).split('?')[0].split('#')[0].replace(/\/+$/, '');
                                            const hrefPath = getPathname(item.href).split('?')[0].split('#')[0].replace(/\/+$/, '');
                                            if (urlPath === hrefPath) return true;
                                            // Check custom matchPaths for sub-page highlighting
                                            if (item.matchPaths?.some(p => urlPath.startsWith(p.replace(/\/+$/, '') + '/'))) return true;
                                            return false;
                                        })()}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter>
                <SidebarGroup className="px-2 py-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton  
                                asChild
                                isActive={isUrlActive(page.url, '/admin/settings/ai')}
                                tooltip={{ children: 'AI Settings' }}
                            >
                                <Link href="/admin/settings/ai">
                                    <Sparkles />
                                    <span>AI Settings</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {(can.access_users || can.access_roles || can.access_permissions) && (
                    <SidebarGroup className="px-2 py-0">
                        <SidebarMenu>
                            <SidebarMenuItem>
                            <SidebarMenuButton  
                                asChild
                                isActive={isUrlActive(page.url, '/admin/user-management/users') || isUrlActive(page.url, '/admin/user-management/roles') || isUrlActive(page.url, '/admin/user-management/permissions')}
                                tooltip={{ children: 'Users & Roles' }}
                            >
                                <Link href={'/admin/user-management/' + (can.access_users ? 'users' : can.access_roles ? 'roles' : 'permissions')} >
                                    <Users />
                                    <span>Users & Roles</span>
                                </Link>
                            </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}

                <Separator className="my-2 border-t" />

                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
