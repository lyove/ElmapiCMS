import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from '@/admin/hooks/use-appearance';
import { applyThemeRadius } from '@/admin/hooks/use-theme-radius';
import { Toaster } from '@/admin/components/ui/sonner';
import { AiChatProvider } from '@/admin/hooks/use-ai-chat';
import type { SharedData } from '@/admin/types';

// Default app name fallback
let dynamicAppName = import.meta.env.VITE_APP_NAME || 'Laravel';

function syncBrandingFromPage(pageProps: SharedData): void {
    const branding = pageProps.branding;
    if (branding?.app_name) {
        dynamicAppName = branding.app_name;
    }

    applyThemeRadius(branding?.theme_radius, branding?.theme_radius_css);
}

createInertiaApp({
    title: (title) => `${dynamicAppName} - ${title}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        syncBrandingFromPage(props.initialPage.props as SharedData);

        root.render(
            <AiChatProvider>
                <App {...props} />
                <Toaster />
            </AiChatProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

router.on('navigate', (event) => {
    syncBrandingFromPage(event.detail.page.props as SharedData);
});

// This will set light / dark mode on load...
initializeTheme();
