const RADIUS_CSS_VALUES: Record<string, string> = {
    none: '0px',
    sm: '0.3rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.4rem',
};

export function resolveThemeRadiusCss(themeRadius?: string | null, themeRadiusCss?: string | null): string {
    if (typeof themeRadiusCss === 'string' && themeRadiusCss !== '') {
        return themeRadiusCss;
    }

    if (typeof themeRadius === 'string' && themeRadius in RADIUS_CSS_VALUES) {
        return RADIUS_CSS_VALUES[themeRadius];
    }

    return RADIUS_CSS_VALUES.md;
}

/**
 * Apply the app roundness token as an inline CSS variable so it wins over
 * bundled/dev-injected stylesheet defaults (including Vite HMR).
 */
export function applyThemeRadius(themeRadius?: string | null, themeRadiusCss?: string | null): void {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.style.setProperty('--radius', resolveThemeRadiusCss(themeRadius, themeRadiusCss));
}
