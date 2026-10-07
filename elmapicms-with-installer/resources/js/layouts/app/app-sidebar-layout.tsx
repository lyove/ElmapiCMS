import { AiChatPanel } from '@/components/ai-chat-panel';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem, type SharedData } from '@/types/index.d';
import { usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { aiEnabled } = usePage<SharedData>().props;

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="max-h-svh overflow-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className='flex-1 overflow-y-auto p-6'>{children}</div>
            </AppContent>
            {aiEnabled && <AiChatPanel />}
        </AppShell>
    );
}
