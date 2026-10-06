const NAIVE_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

type DateInput = string | number | Date | null | undefined;

function normalizeNaiveDateTime(value: string): string {
    if (!NAIVE_DATETIME_REGEX.test(value)) {
        return value;
    }

    return `${value.replace(' ', 'T')}Z`;
}

export function parseServerDate(value: DateInput): Date | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const normalizedValue = normalizeNaiveDateTime(value);
    const parsedDate = new Date(normalizedValue);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function getDateTimestamp(value: DateInput): number {
    const parsedDate = parseServerDate(value);

    return parsedDate ? parsedDate.getTime() : 0;
}

export function formatLocalDateTime(
    value: DateInput,
    options?: Intl.DateTimeFormatOptions,
): string {
    const parsedDate = parseServerDate(value);

    if (!parsedDate) {
        return '—';
    }

    return parsedDate.toLocaleString(undefined, options);
}

export function formatLocalDate(value: DateInput, options?: Intl.DateTimeFormatOptions): string {
    const parsedDate = parseServerDate(value);

    if (!parsedDate) {
        return '—';
    }

    return parsedDate.toLocaleDateString(undefined, options);
}

export function formatRelativeFromNow(value: DateInput): string {
    const parsedDate = parseServerDate(value);

    if (!parsedDate) {
        return '—';
    }

    const now = Date.now();
    const diffMilliseconds = parsedDate.getTime() - now;
    const absoluteDiffMilliseconds = Math.abs(diffMilliseconds);

    if (absoluteDiffMilliseconds < 60000) {
        return 'just now';
    }

    const minutes = Math.round(diffMilliseconds / 60000);
    const absoluteMinutes = Math.abs(minutes);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'always', style: 'long' });

    if (absoluteMinutes < 60) {
        return formatter.format(minutes, 'minute');
    }

    const hours = Math.round(diffMilliseconds / 3600000);
    const absoluteHours = Math.abs(hours);

    if (absoluteHours < 24) {
        return formatter.format(hours, 'hour');
    }

    const days = Math.round(diffMilliseconds / 86400000);
    const absoluteDays = Math.abs(days);

    if (absoluteDays < 7) {
        return formatter.format(days, 'day');
    }

    return formatLocalDate(parsedDate);
}
