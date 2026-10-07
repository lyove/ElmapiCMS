import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';

interface UseUnsavedChangesGuardOptions {
    enabled?: boolean;
}

type PendingVisit = {
    url: string | URL;
    method?: string;
    data?: Record<string, unknown>;
    replace?: boolean;
    preserveScroll?: boolean;
    preserveState?: boolean;
    only?: string[];
    except?: string[];
    headers?: Record<string, string>;
};

function visitUrl(url: string | URL): string {
    if (typeof url === 'string') {
        return url;
    }

    return url.href;
}

function resumeVisit(visit: PendingVisit): void {
    router.visit(visitUrl(visit.url), {
        method: visit.method as 'get' | 'post' | 'put' | 'patch' | 'delete' | undefined,
        data: visit.data,
        replace: visit.replace,
        preserveScroll: visit.preserveScroll,
        preserveState: visit.preserveState,
        only: visit.only,
        except: visit.except,
        headers: visit.headers,
    });
}

export function useUnsavedChangesGuard(isDirty: boolean, { enabled = true }: UseUnsavedChangesGuardOptions = {}) {
    const isDirtyRef = useRef(isDirty);
    const allowNavigationRef = useRef(false);
    const [pendingVisit, setPendingVisit] = useState<PendingVisit | null>(null);

    isDirtyRef.current = isDirty;

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (allowNavigationRef.current || !isDirtyRef.current) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        };

        const removeRouterListener = router.on('before', (event) => {
            if (allowNavigationRef.current || !isDirtyRef.current) {
                return;
            }

            event.preventDefault();
            setPendingVisit(event.detail.visit as PendingVisit);
        });

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            removeRouterListener();
        };
    }, [enabled]);

    const allowNavigation = useCallback(() => {
        allowNavigationRef.current = true;
    }, []);

    const confirmLeave = useCallback(() => {
        if (!pendingVisit) {
            return;
        }

        const visit = pendingVisit;
        setPendingVisit(null);
        allowNavigationRef.current = true;
        resumeVisit(visit);
    }, [pendingVisit]);

    const cancelLeave = useCallback(() => {
        setPendingVisit(null);
    }, []);

    return {
        allowNavigation,
        cancelLeave,
        confirmLeave,
        showLeaveConfirm: pendingVisit !== null,
    };
}
