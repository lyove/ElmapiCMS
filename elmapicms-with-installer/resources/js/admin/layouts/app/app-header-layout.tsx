import { AppContent } from '@/admin/components/app-content';
import { AppHeader } from '@/admin/components/app-header';
import { AppShell } from '@/admin/components/app-shell';
import { type BreadcrumbItem } from '@/admin/types/index.d';
import type { PropsWithChildren } from 'react';

export default function AppHeaderLayout({ children, breadcrumbs }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>{children}</AppContent>
        </AppShell>
    );
}
