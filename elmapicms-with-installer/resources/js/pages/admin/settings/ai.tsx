import { Head, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/admin/types/index.d';
import AppLayout from '@/admin/layouts/app-layout';
import AppSettingsLayout from '@/admin/layouts/settings/app-settings-layout';
import { Label } from '@/admin/components/ui/label';
import { Button } from '@/admin/components/ui/button';
import { Switch } from '@/admin/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/admin/components/ui/select';
import { Input } from '@/admin/components/ui/input';
import InputError from '@/admin/components/input-error';
import { toast } from 'sonner';
import { type FormEventHandler } from 'react';
import { BotMessageSquare } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'App settings', href: '/admin/settings/app' },
    { title: 'AI', href: '/admin/settings/ai' },
];

const providers = [
    { value: 'openai', label: 'OpenAI (GPT)', env: 'OPENAI_API_KEY' },
    { value: 'anthropic', label: 'Anthropic (Claude)', env: 'ANTHROPIC_API_KEY' },
    { value: 'gemini', label: 'Google Gemini', env: 'GEMINI_API_KEY' },
];

interface AiSettingsProps {
    settings: {
        ai_enabled: boolean;
        ai_provider: string;
        ai_model: string | null;
        ai_show_token_usage: boolean;
        ai_max_conversation_messages: number;
        ai_max_tokens: number;
        ai_max_steps: number;
    };
    configured_providers: string[];
}

export default function AiSettings({ settings, configured_providers }: AiSettingsProps) {
    const { data, setData, post, processing, errors } = useForm({
        ai_enabled: settings.ai_enabled,
        ai_provider: settings.ai_provider,
        ai_model: settings.ai_model || '',
        ai_show_token_usage: settings.ai_show_token_usage,
        ai_max_conversation_messages: settings.ai_max_conversation_messages,
        ai_max_tokens: settings.ai_max_tokens,
        ai_max_steps: settings.ai_max_steps,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/admin/settings/ai', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('AI settings saved successfully!');
            },
        });
    };

    const selectedProvider = providers.find((p) => p.value === data.ai_provider);
    const isProviderConfigured = configured_providers.includes(data.ai_provider);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="AI Settings" />
            <AppSettingsLayout>
                <div className="space-y-6">
                    <form onSubmit={submit} className="space-y-8">
                        {/* Enable/Disable AI */}
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                    <BotMessageSquare className="h-5 w-5" />
                                </div>
                                <div>
                                    <Label className="text-base font-medium">AI Features</Label>
                                    <p className="text-muted-foreground text-sm">
                                        Enable AI features across the application
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={data.ai_enabled}
                                onCheckedChange={(checked) => setData('ai_enabled', checked)}
                            />
                        </div>

                        {data.ai_enabled && (
                            <>
                                {/* Provider Selection */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">AI Provider</Label>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Choose the AI provider to use. Add the API key in your <code className="bg-muted rounded px-1 py-0.5 text-xs">.env</code> file.
                                        </p>
                                    </div>
                                    <Select
                                        value={data.ai_provider}
                                        onValueChange={(value) => {
                                            setData('ai_provider', value);
                                            setData('ai_model', '');
                                        }}
                                    >
                                        <SelectTrigger className="max-w-md">
                                            <SelectValue placeholder="Select a provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {providers.map((provider) => (
                                                <SelectItem key={provider.value} value={provider.value}>
                                                    <span className="flex items-center gap-2">
                                                        {provider.label}
                                                        {configured_providers.includes(provider.value) ? (
                                                            <span className="rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                                                Configured
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                                No API key
                                                            </span>
                                                        )}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.ai_provider} />

                                    {!isProviderConfigured && data.ai_provider && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                            Add <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">{selectedProvider?.env}</code> to your <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">.env</code> file to use {selectedProvider?.label}.
                                        </div>
                                    )}
                                </div>

                                {/* Custom Model */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">Model Override</Label>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Optionally specify a model name. Leave empty to use the provider's default.
                                        </p>
                                    </div>
                                    <Input
                                        value={data.ai_model}
                                        onChange={(e) => setData('ai_model', e.target.value)}
                                        placeholder="e.g. claude-sonnet-4-20250514"
                                        className="max-w-md"
                                    />
                                    <InputError message={errors.ai_model} />
                                </div>

                                {/* Show Token Usage */}
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <Label className="text-base font-medium">Show Token Usage</Label>
                                        <p className="text-muted-foreground text-sm">
                                            Display token usage statistics in the AI chat panel
                                        </p>
                                    </div>
                                    <Switch
                                        checked={data.ai_show_token_usage}
                                        onCheckedChange={(checked) => setData('ai_show_token_usage', checked)}
                                    />
                                </div>

                                {/* Max Output Tokens */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">Max Output Tokens</Label>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Maximum number of tokens the AI can generate per response. Higher values allow longer responses but cost more.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min={256}
                                            max={128000}
                                            value={data.ai_max_tokens}
                                            onChange={(e) => setData('ai_max_tokens', parseInt(e.target.value) || 4096)}
                                            className="max-w-[140px]"
                                        />
                                        <span className="text-muted-foreground text-sm">tokens</span>
                                    </div>
                                    <InputError message={errors.ai_max_tokens} />
                                    <p className="text-muted-foreground text-xs">
                                        Default: 4096. Common values: 1024 (short), 4096 (normal), 8192 (long), 16384 (very long). Some models support up to 128K.
                                    </p>
                                </div>

                                {/* Max Steps (Tool Rounds) */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">Max Steps</Label>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Maximum number of tool-calling rounds the AI can perform per response. Each step allows the AI to call a tool and process the result.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={data.ai_max_steps}
                                            onChange={(e) => setData('ai_max_steps', parseInt(e.target.value) || 8)}
                                            className="max-w-[100px]"
                                        />
                                        <span className="text-muted-foreground text-sm">steps</span>
                                    </div>
                                    <InputError message={errors.ai_max_steps} />
                                    <p className="text-muted-foreground text-xs">
                                        Default: 8. Lower values prevent runaway tool loops. Higher values allow more complex multi-step operations.
                                    </p>
                                </div>

                                {/* Conversation Memory */}
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-medium">Conversation Memory</Label>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            How many previous messages the AI remembers in a conversation. Higher values give more context but cost more tokens.
                                            Older messages are still saved in history — they just aren't sent to the AI.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min={2}
                                            max={100}
                                            value={data.ai_max_conversation_messages}
                                            onChange={(e) => setData('ai_max_conversation_messages', parseInt(e.target.value) || 10)}
                                            className="max-w-[100px]"
                                        />
                                        <span className="text-muted-foreground text-sm">messages</span>
                                    </div>
                                    <InputError message={errors.ai_max_conversation_messages} />
                                    <p className="text-muted-foreground text-xs">
                                        Default: 10 (about 5 exchanges). Lower values reduce token usage per message. Minimum: 2, Maximum: 100.
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Submit */}
                        <div className="flex">
                            <Button type="submit" disabled={processing} className="min-w-24">
                                {processing ? (
                                    <>
                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </AppSettingsLayout>
        </AppLayout>
    );
}
