import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = React.useState(false);

    React.useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);

        onChange();
        mql.addEventListener('change', onChange);

        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    return matches;
}

export function useIsMobile() {
    return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/** Matches Tailwind `lg` and below (max-width: 1023px). */
export function useIsBelowLg() {
    return useMediaQuery(`(max-width: ${LG_BREAKPOINT - 1}px)`);
}
