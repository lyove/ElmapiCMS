import { Link, usePage } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { NavItem, Project, UserCan } from '@/types/index.d';
import { Settings as SettingsIcon, Globe, Users, Key, Share2, Download, Shield } from 'lucide-react';
import { PropsWithChildren } from 'react';

interface ProjectSettingsLayoutProps extends PropsWithChildren {
    project: Project;
}

export default function ProjectSettingsLayout({ project, children }: ProjectSettingsLayoutProps) {
    const page = usePage();
    const can = page.props.userCan as UserCan;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : page.url.split('?')[0];
    const basePath = `/admin/projects/${project.id}/settings`;
    const authBasePath = `${basePath}/auth`;
    const isAuthPath = currentPath === authBasePath || currentPath.startsWith(`${authBasePath}/`);
    const sidebarItemClass = 'w-full justify-start border border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
    const sidebarItemActiveClass = 'border-sidebar-border/70 bg-sidebar-accent text-sidebar-accent-foreground';

    type SidebarItem = NavItem & { permission: keyof typeof can | string };

    const sidebarNavItems: SidebarItem[] = [
        { title: 'Project', href: basePath, icon: SettingsIcon, permission: 'access_project_settings' },
        { title: 'Localization', href: `${basePath}/localization`, icon: Globe, permission: 'access_localization_settings' },
        { title: 'User Access', href: `${basePath}/user-access`, icon: Users, permission: 'access_user_access_settings' },
        { title: 'API Access', href: `${basePath}/api-access`, icon: Key, permission: 'access_api_access_settings' },
        { title: 'Auth', href: `${basePath}/auth`, icon: Shield, permission: 'access_auth_settings' },
        { title: 'Webhooks', href: `${basePath}/webhooks`, icon: Share2, permission: 'access_webhooks_settings' },
        { title: 'Export/Import', href: `${basePath}/export-import`, icon: Download, permission: 'access_project_settings' },
    ];
    const authSubItems: NavItem[] = [
        { title: 'Overview', href: authBasePath },
        { title: 'Users', href: `${authBasePath}/users` },
        { title: 'Sessions', href: `${authBasePath}/sessions` },
        { title: 'API Keys', href: `${authBasePath}/api-keys` },
        { title: 'Audit Log', href: `${authBasePath}/audit-log` },
        { title: 'Email Verification', href: `${authBasePath}/email-verification` },
    ];

    return (
        <div>
            <Heading title="Project Settings" description="Manage settings for this project" />

            <div className="flex flex-col lg:flex-row lg:items-start lg:space-y-0 lg:space-x-12">
                <aside className="w-full shrink-0 lg:sticky lg:top-0 lg:z-10 lg:w-48 lg:self-start lg:bg-background">
                    <nav className="flex flex-col space-y-1 rounded-md p-1">
                        {sidebarNavItems
                            .filter((item) => can[item.permission])
                            .map((item, index) => (
                                <div key={`${item.href}-${index}`}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className={cn(sidebarItemClass, {
                                            [sidebarItemActiveClass]: item.href === authBasePath ? isAuthPath : currentPath === item.href,
                                        })}
                                    >
                                        <Link href={item.href}>
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                            {item.title}
                                        </Link>
                                    </Button>
                                    {item.href === authBasePath && isAuthPath && can.access_auth_settings && (
                                        <div className="ml-6 mt-1 flex flex-col gap-1">
                                            {authSubItems.map((subItem) => (
                                                <Button
                                                    key={subItem.href}
                                                    size="sm"
                                                    variant="ghost"
                                                    asChild
                                                    className={cn('h-8 justify-start px-2 text-xs text-sidebar-foreground/80 hover:text-sidebar-accent-foreground', {
                                                        'bg-sidebar-accent text-sidebar-accent-foreground': currentPath === subItem.href,
                                                    })}
                                                >
                                                    <Link href={subItem.href}>{subItem.title}</Link>
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 w-full">
                    <section className="w-full space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
} 