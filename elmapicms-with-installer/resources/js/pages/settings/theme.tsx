import { Head, router, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types/index.d';
import AppLayout from '@/layouts/app-layout';
import AppSettingsLayout from '@/layouts/settings/app-settings-layout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { applyThemeRadius } from '@/hooks/use-theme-radius';
import { toast } from 'sonner';
import { type FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'App settings', href: '/settings/app' },
    { title: 'Theme', href: '/settings/theme' },
];

const radiusPreviewPx: Record<string, number> = {
    none: 0,
    sm: 3,
    md: 5,
    lg: 7,
    xl: 10,
    '2xl': 14,
};

interface ThemeSettingsProps {
    settings: {
        font_family: string;
        theme_radius: string;
        current_preset_key: string;
        theme_css: string;
        custom_theme_css: string;
        has_custom_theme: boolean;
    };
    font_options: {
        value: string;
        label: string;
    }[];
    radius_options: {
        value: string;
        label: string;
    }[];
    theme_presets: {
        key: string;
        label: string;
        theme_css: string;
    }[];
}

export default function ThemeSettings({ settings, font_options, radius_options, theme_presets }: ThemeSettingsProps) {
    const initialPresetKey = settings.current_preset_key || 'custom';
    const { data, setData, post, processing, errors, reset } = useForm({
        font_family: settings.font_family,
        theme_radius: settings.theme_radius,
        preset_key: initialPresetKey,
        theme_css: settings.theme_css || '',
        custom_theme_css: settings.custom_theme_css || '',
        clear_theme: false,
    });
    const isCustomPreset = data.preset_key === 'custom';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('settings.theme.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Theme settings saved.');
                reset('clear_theme');
                window.location.reload();
            },
        });
    };

    const resetTheme = () => {
        router.post(route('settings.theme.update'), {
            font_family: data.font_family,
            theme_radius: data.theme_radius,
            theme_css: '',
            clear_theme: true,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Theme reset to default.');
                setData('theme_css', '');
                setData('custom_theme_css', '');
                setData('clear_theme', false);
                window.location.reload();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Theme Settings" />
            <AppSettingsLayout>
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-base font-medium">App Font</Label>
                            <p className="text-sm text-muted-foreground">Choose the default font used across the application.</p>
                            <div className="max-w-md space-y-2">
                                <Select value={data.font_family} onValueChange={(value) => setData('font_family', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a font" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {font_options.map((font) => (
                                            <SelectItem key={font.value} value={font.value}>
                                                {font.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.font_family} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-base font-medium">Roundness</Label>
                            <p className="text-sm text-muted-foreground">Control how rounded corners appear across the application.</p>
                            <div className="max-w-md space-y-2">
                                <Select
                                    value={data.theme_radius}
                                    onValueChange={(value) => {
                                        setData('theme_radius', value);
                                        applyThemeRadius(value);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select roundness" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {radius_options.map((radius) => (
                                            <SelectItem key={radius.value} value={radius.value}>
                                                <span className="flex items-center gap-3">
                                                    <span
                                                        className="size-4 border border-foreground/40 bg-muted"
                                                        style={{ borderRadius: radiusPreviewPx[radius.value] ?? 5 }}
                                                    />
                                                    {radius.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.theme_radius} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-base font-medium">Theme Preset</Label>
                            <p className="text-sm text-muted-foreground">Choose a preset or select Custom to paste your own CSS.</p>
                            <div className="max-w-md space-y-2">
                                <Select
                                    value={data.preset_key}
                                    onValueChange={(value) => {
                                        const preset = theme_presets.find((item) => item.key === value);
                                        setData('preset_key', value);
                                        if (value === 'custom') {
                                            setData('theme_css', data.custom_theme_css || '');
                                        } else {
                                            setData('theme_css', preset?.theme_css || '');
                                        }
                                        setData('clear_theme', false);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">Custom</SelectItem>
                                        {theme_presets.map((preset) => (
                                            <SelectItem key={preset.key} value={preset.key}>
                                                {preset.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.preset_key} />
                            </div>
                        </div>

                        {isCustomPreset && (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Theme CSS (tweakcn format)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Paste the <code>:root</code> and <code>.dark</code> variable blocks from tweakcn. Only supported design tokens are
                                        extracted and saved to keep runtime lightweight.
                                    </p>
                                </div>

                                <Textarea
                                    value={data.theme_css}
                                    onChange={(e) => {
                                        setData('theme_css', e.target.value);
                                        setData('custom_theme_css', e.target.value);
                                        setData('clear_theme', false);
                                    }}
                                    placeholder="Paste theme CSS here..."
                                    className="min-h-[320px] font-mono text-xs leading-5"
                                />
                                <InputError message={errors.theme_css} />
                            </>
                        )}

                        <div className="flex gap-3">
                            <Button type="submit" disabled={processing} className="min-w-24">
                                {processing ? 'Saving...' : 'Save Theme'}
                            </Button>
                            {settings.has_custom_theme && (
                                <Button type="button" variant="outline" onClick={resetTheme} disabled={processing}>
                                    Reset to Default
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </AppSettingsLayout>
        </AppLayout>
    );
}
