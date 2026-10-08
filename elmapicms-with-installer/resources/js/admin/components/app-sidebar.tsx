import { NavMain } from '@/admin/components/nav-main';
import { NavUser } from '@/admin/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarGroup, SidebarGroupLabel } from '@/admin/components/ui/sidebar';
import { type NavItem, SharedData, Project, UserCan } from '@/admin/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, Settings, Webhook, Image, Users, Folder, Key, Globe, Download, Sparkles, Shield } from 'lucide-react';
import AppLogo from './app-logo';
import { Separator } from '@radix-ui/react-separator';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutGrid,
    }
];

export function AppSidebar() {
    const page = usePage<SharedData>();
    const currentProject = page.props.project as Project | undefined;
    
    const can = usePage().props.userCan as UserCan;

    // Generate project menu items if we're on a project page
    const projectMenuItems: (NavItem & { permission?: string })[] = currentProject ? [
        {
            title: 'Collections',
            href: route('projects.show', currentProject.id),
            icon: Folder,
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
        {
            title: 'Localization',
            href: route('projects.settings.localization', currentProject.id),
            icon: Globe,
            permission: 'access_localization_settings',
        },
        {
            title: 'User Access',
            href: route('projects.settings.user-access', currentProject.id),
            icon: Users,
            permission: 'access_user_access_settings',
        },
        {
            title: 'API Access',
            href: route('projects.settings.api-access', currentProject.id),
            icon: Key,
            permission: 'access_api_access_settings',
        },
        {
            title: 'Auth',
            href: route('projects.settings.auth.index', currentProject.id),
            icon: Shield,
            permission: 'access_auth_settings',
        },
        {
            title: 'Webhooks',
            href: route('projects.settings.webhooks', currentProject.id),
            icon: Webhook,
            permission: 'access_webhooks_settings',
        },
        {
            title: 'Export/Import',
            href: route('projects.settings.export-import', currentProject.id),
            icon: Download,
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
                                        isActive={page.url.includes(item.href)}
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
                                isActive={page.url.includes('/admin/settings/ai')}
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
                                isActive={page.url.includes('/admin/user-management/users') || page.url.includes('/admin/user-management/roles') || page.url.includes('/admin/user-management/permissions')}
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
