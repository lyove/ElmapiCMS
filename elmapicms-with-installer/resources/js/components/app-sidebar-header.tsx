import { Breadcrumbs } from '@/components/breadcrumbs';
import { useAiChat } from '@/hooks/use-ai-chat';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { BotMessageSquare } from 'lucide-react';
import { usePage } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { toggle, isOpen } = useAiChat();
    const { aiEnabled } = usePage<SharedData>().props;

    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            {aiEnabled && !isOpen && (
                <button
                    onClick={toggle}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    title="Open AI Assistant"
                >
                    <BotMessageSquare className="h-4 w-4" />
                </button>
            )}
        </header>
    );
}
