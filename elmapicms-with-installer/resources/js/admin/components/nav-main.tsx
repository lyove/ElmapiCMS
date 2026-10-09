import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/admin/components/ui/sidebar';
import { type NavItem } from '@/admin/types';
import { Link, usePage } from '@inertiajs/react';

function getPathname(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

function isUrlActive(currentUrl: string, href: string, exact = false): boolean {
    const urlPath = getPathname(currentUrl).split('?')[0].split('#')[0].replace(/\/+$/, '');
    const hrefPath = getPathname(href).split('?')[0].split('#')[0].replace(/\/+$/, '');
    if (urlPath === hrefPath) return true;
    if (!exact && urlPath.startsWith(hrefPath + '/')) return true;
    return false;
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton  
                            asChild isActive={isUrlActive(page.url as string, item.href, true)}
                            tooltip={{ children: item.title }}
                        >
                            <Link href={item.href}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
