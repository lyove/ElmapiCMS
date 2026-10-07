import { Head, Link, router } from '@inertiajs/react';
import type { Project, BreadcrumbItem } from '@/admin/types';
import { Button } from '@/admin/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/admin/components/ui/dialog';
import { ScrollArea } from '@/admin/components/ui/scroll-area';
import { Badge } from '@/admin/components/ui/badge';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/admin/components/ui/pagination';
import AppLayout from '@/admin/layouts/app-layout';
import ProjectSettingsLayout from './layout';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { formatLocalDateTime } from '@/admin/lib/date';

interface LogRow {
    id: number;
    status: string;
    action: string;
    created_at: string;
    url?: string;
    request?: unknown;
    response: unknown;
}

interface Props {
    project: Project;
    webhook: { id: number; name: string };
    logs: {
        data: LogRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
}

export default function WebhookLogsPage({ project, webhook, logs }: Props) {
    const [selectedLog, setSelectedLog] = useState<LogRow | null>(null);

    useEffect(() => {
        setSelectedLog(null);
    }, [logs.current_page]);

    const handlePageChange = (page: number) => {
        router.get(
            route('projects.settings.webhooks.logs', [project.id, webhook.id]),
            { page },
            { preserveState: true, preserveScroll: true },
        );
    };
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Webhooks', href: route('projects.settings.webhooks', project.id) },
        { title: 'Logs', href: route('projects.settings.webhooks.logs', [project.id, webhook.id]) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Webhook Logs - ${webhook.name}`} />

            <ProjectSettingsLayout project={project}>
                <div className="mb-6 space-y-3">
                    <Link
                        href={route('projects.settings.webhooks', project.id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4 shrink-0" aria-hidden />
                        Back to webhooks
                    </Link>
                    <h2 className="text-xl font-semibold">Logs for {webhook.name}</h2>
                </div>
                <div className="overflow-x-auto rounded-md border border-sidebar-border/70 bg-sidebar">
                    <table className="min-w-full text-sm text-sidebar-foreground">
                        <thead className="border-b border-sidebar-border/70 bg-sidebar/60">
                            <tr>
                                <th className="px-4 py-2 text-left">Date</th>
                                <th className="px-4 py-2 text-left">Event</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">URL</th>
                                <th className="px-4 py-2 text-left">Response</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.map(l => (
                                <tr key={l.id} className="border-t border-sidebar-border/70 hover:bg-sidebar-accent/20">
                                    <td className="px-4 py-2">{formatLocalDateTime(l.created_at)}</td>
                                    <td className="px-4 py-2">{l.action}</td>
                                    <td className="px-4 py-2">
                                        {(() => {
                                            const code = Number(l.status);
                                            const variant = isNaN(code)
                                                ? 'secondary'
                                                : code < 400
                                                    ? 'default'
                                                    : 'destructive';
                                            return (
                                                <Badge variant={variant}>{l.status}</Badge>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-2 truncate max-w-[200px]" title={l.url}>{l.url?.slice(0,40)}</td>
                                    <td className="px-4 py-2 truncate max-w-[300px]" title={typeof l.response === 'string' ? l.response : JSON.stringify(l.response)}>
                                        {typeof l.response === 'string' ? l.response : JSON.stringify(l.response).slice(0,120)+'...'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <Button size="sm" variant="secondary" onClick={()=>setSelectedLog(l)}>View</Button>
                                    </td>
                                </tr>
                            ))}
                            {logs.data.length === 0 && (
                                <tr>
                                    <td className="px-4 py-6 text-sidebar-foreground/70" colSpan={6}>
                                        No logs yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full sm:w-1/2">
                        {logs.last_page > 1 && (
                            <Pagination className="justify-start">
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handlePageChange(logs.current_page - 1);
                                            }}
                                            aria-disabled={logs.current_page === 1}
                                            className={logs.current_page === 1 ? 'pointer-events-none opacity-50' : ''}
                                        />
                                    </PaginationItem>

                                    <PaginationItem>
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handlePageChange(1);
                                            }}
                                            isActive={logs.current_page === 1}
                                        >
                                            1
                                        </PaginationLink>
                                    </PaginationItem>

                                    {logs.current_page > 3 && (
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    )}

                                    {logs.current_page > 2 && (
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePageChange(logs.current_page - 1);
                                                }}
                                            >
                                                {logs.current_page - 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )}

                                    {logs.current_page !== 1 && logs.current_page !== logs.last_page && (
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePageChange(logs.current_page);
                                                }}
                                                isActive
                                            >
                                                {logs.current_page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )}

                                    {logs.current_page < logs.last_page - 1 && (
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePageChange(logs.current_page + 1);
                                                }}
                                            >
                                                {logs.current_page + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )}

                                    {logs.current_page < logs.last_page - 2 && (
                                        <PaginationItem>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    )}

                                    {logs.last_page > 1 && (
                                        <PaginationItem>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handlePageChange(logs.last_page);
                                                }}
                                                isActive={logs.current_page === logs.last_page}
                                            >
                                                {logs.last_page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    )}

                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handlePageChange(logs.current_page + 1);
                                            }}
                                            aria-disabled={logs.current_page === logs.last_page}
                                            className={
                                                logs.current_page === logs.last_page ? 'pointer-events-none opacity-50' : ''
                                            }
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>
                    {logs.total > 0 && (
                        <div className="text-muted-foreground text-sm sm:ml-auto">
                            Showing <span className="font-semibold">{logs.from}</span> to{' '}
                            <span className="font-semibold">{logs.to}</span> of{' '}
                            <span className="font-semibold">{logs.total}</span> logs
                        </div>
                    )}
                </div>

                {/* Detail Dialog */}
                <Dialog open={!!selectedLog} onOpenChange={(open)=>!open && setSelectedLog(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Webhook Call Details</DialogTitle>
                            <DialogDescription className='sr-only'></DialogDescription>
                        </DialogHeader>
                        {selectedLog && (
                            <ScrollArea className="h-[60vh] pr-4">
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <h3 className="font-medium">General</h3>
                                        <p><strong>Date:</strong> {formatLocalDateTime(selectedLog.created_at)}</p>
                                        <p><strong>Event:</strong> {selectedLog.action}</p>
                                        <p><strong>Status:</strong> {selectedLog.status}</p>
                                        {selectedLog.url && <p><strong>URL:</strong> {selectedLog.url}</p>}
                                    </div>
                                    {Boolean(selectedLog.request) && (
                                        <div>
                                            <h3 className="font-medium">Request Payload</h3>
                                            <pre className="bg-muted rounded p-3 whitespace-pre-wrap text-xs">{JSON.stringify(selectedLog.request, null, 2)}</pre>
                                        </div>
                                    )}
                                    {Boolean(selectedLog.response) && (
                                        <div>
                                            <h3 className="font-medium">Response</h3>
                                            <pre className="bg-muted rounded p-3 whitespace-pre-wrap text-xs">{typeof selectedLog.response === 'string' ? selectedLog.response : JSON.stringify(selectedLog.response, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                        <DialogFooter>
                            <Button onClick={()=>setSelectedLog(null)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </ProjectSettingsLayout>
        </AppLayout>
    );
} 