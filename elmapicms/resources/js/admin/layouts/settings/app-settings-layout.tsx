import Heading from '@/admin/components/heading';
import { Button } from '@/admin/components/ui/button';
import { Separator } from '@/admin/components/ui/separator';
import { cn } from '@/admin/lib/utils';
import { type NavItem } from '@/admin/types';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'General',
        href: '/admin/settings/app',
        icon: null,
    },
    {
        title: 'AI',
        href: '/admin/settings/ai',
        icon: null,
    },
    {
        title: 'Theme',
        href: '/admin/settings/theme',
        icon: null,
    },
];

export default function AppSettingsLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;
    const sidebarItemClass = 'w-full justify-start border border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
    const sidebarItemActiveClass = 'border-sidebar-border/70 bg-sidebar-accent text-sidebar-accent-foreground';

    return (
        <div>
            <Heading title="App Settings" description="Manage your app settings" />

            <div className="flex flex-col lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full lg:w-48">
                    <nav className="flex flex-col space-y-1 rounded-md p-1">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(sidebarItemClass, {
                                    [sidebarItemActiveClass]: currentPath === item.href,
                                })}
                            >
                                <Link href={item.href}>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
