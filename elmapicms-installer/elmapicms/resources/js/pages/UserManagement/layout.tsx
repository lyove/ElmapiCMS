import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

import { type NavItem, type UserCan } from '@/types';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Shield, Key } from 'lucide-react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Manage Users',
        href: '/user-management/users',
        icon: Users,
    },
    {
        title: 'Roles',
        href: '/user-management/roles',
        icon: Shield,
    },
    {
        title: 'Permissions',
        href: '/user-management/permissions',
        icon: Key,
    },
];

interface UserManagementLayoutProps {
    children: React.ReactNode;
    can: UserCan;
}

export default function UserManagementLayout({ children, can }: UserManagementLayoutProps) {
    // When server-side rendering, we only render the layout on the client
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;
    const sidebarItemClass = 'w-full justify-start border border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground';
    const sidebarItemActiveClass = 'border-sidebar-border/70 bg-sidebar-accent text-sidebar-accent-foreground';

    return (
        <div>
            <Heading title="User Management" description="Manage users, roles, and permissions" />

            <div className="flex flex-col lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full lg:w-48">
                    <nav className="flex flex-col space-y-1 rounded-md p-1">
                        {sidebarNavItems.map((item, index) => (
                            can['access_' + item.href.split('/').pop() as keyof typeof can] && (
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
                                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                        {item.title}
                                    </Link>
                                </Button>
                            )
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" orientation="horizontal" />

                <div className="flex-1 min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
} 