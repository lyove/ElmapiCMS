import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState, useCallback, type ComponentProps, type ComponentType } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Ban, ShieldCheck, Copy, RefreshCw, UserX, Key, Users as UsersIcon, Activity, MonitorSmartphone, Shield, MailCheck, MailX } from 'lucide-react';

import type { Project, BreadcrumbItem, UserCan } from '@/admin/types';

import AppLayout from '@/admin/layouts/app-layout';
import ProjectSettingsLayout from '../layout';
import HeadingSmall from '@/admin/components/heading-small';
import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Label } from '@/admin/components/ui/label';
import { Badge } from '@/admin/components/ui/badge';
import { Separator } from '@/admin/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/admin/components/ui/card';
import { Checkbox } from '@/admin/components/ui/checkbox';
import { Switch } from '@/admin/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/admin/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/admin/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '@/admin/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/admin/components/ui/tooltip';
import InputError from '@/admin/components/input-error';
import { formatLocalDateTime, parseServerDate } from '@/admin/lib/date';
import { DatePicker } from '@/admin/components/ui/date-picker';
import MultiSelect from '@/admin/components/ui/select/Select';

type JsonObject = Record<string, unknown>;
const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message;
        return message ?? fallback;
    }

    return fallback;
};

interface AuthUser {
    id: number;
    uuid: string;
    email: string;
    display_name: string | null;
    email_verified_at: string | null;
    metadata: JsonObject | null;
    last_login_at: string | null;
    suspended_at: string | null;
    created_at: string;
    sessions_count?: number;
}

interface Session {
    id: number;
    session_uuid: string;
    ip_address: string | null;
    user_agent: string | null;
    last_activity_at: string | null;
    expires_at: string;
    revoked_at: string | null;
    created_at: string;
    auth_user?: { uuid: string; email: string; display_name: string | null };
}

interface UserApiKey {
    id: number;
    project_auth_user_id: number;
    name: string;
    key_prefix: string;
    scopes: string[] | null;
    expires_at: string | null;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
    auth_user?: { id: number; uuid: string; email: string; display_name: string | null } | null;
}

interface AuditEvent {
    id: number;
    event_type: string;
    ip_address: string | null;
    user_agent: string | null;
    risk_flags: string[] | null;
    metadata: JsonObject | null;
    occurred_at: string;
    deleted_user_email?: string | null;
    auth_user?: { uuid: string; email: string; display_name: string | null } | null;
}

interface Props {
    project: Project;
    stats: {
        total_users: number;
        verified_users: number;
        unverified_users: number;
        suspended_users: number;
        active_sessions: number;
        total_sessions: number;
        active_api_keys: number;
    };
    authSettings: {
        require_verified_email: boolean;
        verification_email: {
            subject: string;
            heading: string;
            intro: string;
            button_text: string;
            outro: string;
            from_name: string;
            from_email: string;
            verification_url_base: string;
        };
    };
}

function formatDate(d: string | null): string {
    if (!d) return '—';
    return formatLocalDateTime(d);
}

function IconActionButton({ tooltip, children, ...props }: ComponentProps<typeof Button> & { tooltip: string }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button {...props}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
}

export default function AuthSettingsIndex({ project, stats, authSettings }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: project.name, href: route('projects.show', project.id) },
        { title: 'Settings', href: route('projects.settings.project', project.id) },
        { title: 'Authentication', href: route('projects.settings.auth.index', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Authentication settings" />
            <ProjectSettingsLayout project={project}>
                <div className="max-w-6xl space-y-6">
                    <HeadingSmall title="End-User Authentication" description="Overview of your project auth health, usage, and policy state." />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Users" value={stats.total_users} icon={UsersIcon} />
                        <StatCard label="Verified Users" value={stats.verified_users} icon={Shield} />
                        <StatCard label="Unverified Users" value={stats.unverified_users} icon={MailCheck} />
                        <StatCard label="Suspended Users" value={stats.suspended_users} icon={Ban} />
                        <StatCard label="Valid Sessions" value={stats.active_sessions} icon={MonitorSmartphone} />
                        <StatCard label="Total Sessions" value={stats.total_sessions} icon={Activity} />
                        <StatCard label="Active API Keys" value={stats.active_api_keys} icon={Key} />
                    </div>

                    <Card>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-base">Email Verification</CardTitle>
                            <CardDescription>Current enforcement state for project sign-ins.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Badge variant={authSettings.require_verified_email ? 'secondary' : 'outline'}>
                                    {authSettings.require_verified_email ? 'Required for sign-in' : 'Optional'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {authSettings.require_verified_email
                                        ? 'Unverified users cannot obtain new tokens.'
                                        : 'Unverified users can continue to sign in.'}
                                </span>
                            </div>
                            <Button asChild size="sm" variant="outline">
                                <Link href={route('projects.settings.auth.email-verification.page', project.id)}>Manage Email Verification</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Separator />
                </div>
            </ProjectSettingsLayout>
        </AppLayout>
    );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ComponentType<{ className?: string }> }) {
    return (
        <Card className="gap-3 py-4">
            <CardHeader className="flex-row items-center justify-between px-4">
                <CardDescription>{label}</CardDescription>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4">
                <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
        </Card>
    );
}

export function VerificationSettingsCard({ project, authSettings }: { project: Project; authSettings: Props['authSettings'] }) {
    const [form, setForm] = useState({
        require_verified_email: authSettings.require_verified_email,
        ...authSettings.verification_email,
    });
    const [loading, setLoading] = useState(false);
    const [showPolicyConfirm, setShowPolicyConfirm] = useState(false);

    const updateForm = (key: string, value: string | boolean) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    const save = async () => {
        setLoading(true);
        try {
            await axios.put(route('projects.settings.auth.settings.update', project.id), {
                require_verified_email: form.require_verified_email,
                verification_email: {
                    subject: form.subject,
                    heading: form.heading,
                    intro: form.intro,
                    button_text: form.button_text,
                    outro: form.outro,
                    from_name: form.from_name,
                    from_email: form.from_email,
                    verification_url_base: form.verification_url_base,
                },
            });
            toast.success('Auth settings updated');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update auth settings'));
        } finally {
            setLoading(false);
        }
    };

    const onSaveClick = () => {
        if (form.require_verified_email && !authSettings.require_verified_email) {
            setShowPolicyConfirm(true);

            return;
        }

        save();
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold">Email Verification</h3>
                <p className="text-sm text-muted-foreground">
                    Configure whether verified email is required for sign-in and customize the verification email content.
                </p>
            </div>
            <div className="space-y-4">
                <div className="flex items-start justify-between rounded-md border p-3">
                    <div className="space-y-1">
                        <p className="font-medium">Require verified email for login</p>
                        <p className="text-xs text-muted-foreground">
                            When enabled, unverified users cannot obtain new tokens. Existing unverified sessions are revoked.
                        </p>
                    </div>
                    <Switch
                        checked={form.require_verified_email}
                        onCheckedChange={(checked) => updateForm('require_verified_email', checked === true)}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Email Subject</Label>
                        <Input value={form.subject} onChange={(e) => updateForm('subject', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Heading</Label>
                        <Input value={form.heading} onChange={(e) => updateForm('heading', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Intro Text</Label>
                        <Input value={form.intro} onChange={(e) => updateForm('intro', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Button Text</Label>
                        <Input value={form.button_text} onChange={(e) => updateForm('button_text', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Outro Text</Label>
                        <Input value={form.outro} onChange={(e) => updateForm('outro', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>From Name</Label>
                        <Input value={form.from_name} onChange={(e) => updateForm('from_name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>From Email</Label>
                        <Input value={form.from_email} onChange={(e) => updateForm('from_email', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Verification URL Base</Label>
                        <Input value={form.verification_url_base} onChange={(e) => updateForm('verification_url_base', e.target.value)} />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={onSaveClick} disabled={loading}>
                        Save Verification Settings
                    </Button>
                </div>
            </div>

            <AlertDialog open={showPolicyConfirm} onOpenChange={setShowPolicyConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Enable strict verification policy?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enabling this policy will revoke active sessions for users whose emails are not verified. They must verify before signing in again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setShowPolicyConfirm(false);
                                save();
                            }}
                        >
                            Enable and Revoke Sessions
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/* ============================== USERS TAB ============================== */

export function UsersTab({ project, can }: { project: Project; can: UserCan }) {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editing, setEditing] = useState<AuthUser | null>(null);
    const [form, setForm] = useState({ email: '', password: '', display_name: '' });
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
    const [userToToggleSuspend, setUserToToggleSuspend] = useState<AuthUser | null>(null);
    const [userToToggleVerify, setUserToToggleVerify] = useState<AuthUser | null>(null);
    const [userToResendVerification, setUserToResendVerification] = useState<AuthUser | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('projects.settings.auth.users.index', project.id));
            setUsers(res.data.data ?? []);
        } catch { toast.error('Failed to load users'); }
        setLoading(false);
    }, [project.id]);

    useEffect(() => { load(); }, [load]);

    const resetForm = () => {
        setEditing(null);
        setForm({ email: '', password: '', display_name: '' });
        setErrors({});
    };

    const save = async () => {
        try {
            if (editing) {
                const payload: Record<string, string> = { display_name: form.display_name };
                if (form.email !== editing.email) payload.email = form.email;
                if (form.password) payload.password = form.password;
                await axios.put(route('projects.settings.auth.users.update', [project.id, editing.id]), payload);
                toast.success('User updated');
            } else {
                await axios.post(route('projects.settings.auth.users.store', project.id), form);
                toast.success('User created');
            }
            setShowDialog(false);
            resetForm();
            load();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                const validationErrors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
                setErrors(validationErrors ?? {});
            }
            else { toast.error('Failed to save user'); }
        }
    };

    const toggleSuspend = async (user: AuthUser) => {
        try {
            await axios.put(route('projects.settings.auth.users.update', [project.id, user.id]), { suspended: !user.suspended_at });
            toast.success(user.suspended_at ? 'User unsuspended' : 'User suspended');
            load();
        } catch { toast.error('Failed'); }
    };

    const confirmToggleSuspend = async () => {
        if (!userToToggleSuspend) return;

        await toggleSuspend(userToToggleSuspend);
        setUserToToggleSuspend(null);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await axios.delete(route('projects.settings.auth.users.destroy', [project.id, userToDelete.id]));
            toast.success('User deleted');
            setUserToDelete(null);
            load();
        } catch { toast.error('Failed'); }
    };

    const toggleVerification = async (user: AuthUser) => {
        try {
            await axios.put(route('projects.settings.auth.users.update', [project.id, user.id]), { verified: !user.email_verified_at });
            toast.success(user.email_verified_at ? 'User marked as unverified' : 'User verified');
            load();
        } catch {
            toast.error('Failed');
        }
    };

    const resendVerification = async (user: AuthUser) => {
        try {
            await axios.post(route('projects.settings.auth.users.resend-verification', [project.id, user.id]));
            toast.success('Verification email sent');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to send verification email'));
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold">Users</h3>
                <p className="text-sm text-muted-foreground">Create and manage end-users for this project auth service.</p>
            </div>

            <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</span>
                {can.access_auth_settings && (
                    <Button size="sm" onClick={() => { resetForm(); setShowDialog(true); }}>
                        <Plus className="w-4 h-4 mr-1" /> Create User
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted/50" />)}</div>
            ) : users.length === 0 ? (
                <p className="py-6 text-muted-foreground">No end-users registered yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border bg-card">
                    <table className="min-w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Sessions</th>
                                <th className="px-4 py-2 text-left">Last Login</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-t hover:bg-muted/40">
                                    <td className="px-4 py-2 font-medium">{u.email}</td>
                                    <td className="px-4 py-2">{u.display_name || '—'}</td>
                                    <td className="px-4 py-2">
                                        {u.suspended_at ? (
                                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                                        ) : u.email_verified_at ? (
                                            <Badge variant="secondary" className="text-xs">Active</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs">Unverified</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{u.sessions_count ?? 0}</td>
                                    <td className="px-4 py-2 text-xs">{formatDate(u.last_login_at)}</td>
                                    <td className="px-4 py-2 text-right whitespace-nowrap">
                                        <IconActionButton tooltip="Edit" variant="ghost" size="icon" onClick={() => {
                                            setEditing(u);
                                            setForm({ email: u.email, password: '', display_name: u.display_name ?? '' });
                                            setShowDialog(true);
                                        }}>
                                            <Pencil className="w-4 h-4" />
                                        </IconActionButton>
                                        <IconActionButton
                                            tooltip={u.suspended_at ? 'Unsuspend' : 'Suspend'}
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setUserToToggleSuspend(u)}
                                        >
                                            {u.suspended_at ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                        </IconActionButton>
                                        <IconActionButton
                                            tooltip={u.email_verified_at ? 'Mark as unverified' : 'Mark as verified'}
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setUserToToggleVerify(u)}
                                        >
                                            {u.email_verified_at ? <MailX className="w-4 h-4" /> : <MailCheck className="w-4 h-4" />}
                                        </IconActionButton>
                                        {!u.email_verified_at && (
                                            <IconActionButton
                                                tooltip="Resend verification email"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setUserToResendVerification(u)}
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </IconActionButton>
                                        )}
                                        <IconActionButton tooltip="Delete" variant="ghost" size="icon" onClick={() => setUserToDelete(u)}>
                                            <Trash2 className="w-4 h-4" />
                                        </IconActionButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit User' : 'Create User'}</DialogTitle>
                        <DialogDescription>{editing ? 'Update user details.' : 'Create a new end-user for this project.'}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                name="auth_user_email"
                                autoComplete="off"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                type="email"
                            />
                            <InputError message={errors.email?.[0]} />
                        </div>
                        <div className="space-y-2">
                            <Label>{editing ? 'New Password (leave blank to keep)' : 'Password'}</Label>
                            <Input
                                name="auth_user_password"
                                autoComplete="new-password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                type="password"
                            />
                            <InputError message={errors.password?.[0]} />
                        </div>
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                                name="auth_user_display_name"
                                autoComplete="off"
                                value={form.display_name}
                                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
                        <Button onClick={save} disabled={!form.email || (!editing && !form.password)}>{editing ? 'Save' : 'Create'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={userToDelete !== null} onOpenChange={(o) => { if (!o) setUserToDelete(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{userToDelete?.email}</strong>? All their sessions and tokens will be invalidated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={userToToggleSuspend !== null} onOpenChange={(o) => { if (!o) setUserToToggleSuspend(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{userToToggleSuspend?.suspended_at ? 'Unsuspend User' : 'Suspend User'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToToggleSuspend?.suspended_at
                                ? <>Are you sure you want to unsuspend <strong>{userToToggleSuspend?.email}</strong>?</>
                                : <>Are you sure you want to suspend <strong>{userToToggleSuspend?.email}</strong>? They will not be able to sign in until unsuspended.</>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button variant={userToToggleSuspend?.suspended_at ? 'secondary' : 'destructive'} onClick={confirmToggleSuspend}>
                            {userToToggleSuspend?.suspended_at ? 'Unsuspend' : 'Suspend'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={userToToggleVerify !== null} onOpenChange={(o) => { if (!o) setUserToToggleVerify(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{userToToggleVerify?.email_verified_at ? 'Mark User as Unverified' : 'Verify User'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToToggleVerify?.email_verified_at
                                ? <>Mark <strong>{userToToggleVerify?.email}</strong> as unverified? They may lose access based on the project verification policy.</>
                                : <>Verify <strong>{userToToggleVerify?.email}</strong> now?</>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            variant={userToToggleVerify?.email_verified_at ? 'destructive' : 'secondary'}
                            onClick={async () => {
                                if (!userToToggleVerify) return;
                                await toggleVerification(userToToggleVerify);
                                setUserToToggleVerify(null);
                            }}
                        >
                            {userToToggleVerify?.email_verified_at ? 'Mark Unverified' : 'Verify'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={userToResendVerification !== null} onOpenChange={(o) => { if (!o) setUserToResendVerification(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resend Verification Email</AlertDialogTitle>
                        <AlertDialogDescription>
                            Resend verification email to <strong>{userToResendVerification?.email}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            onClick={async () => {
                                if (!userToResendVerification) return;
                                await resendVerification(userToResendVerification);
                                setUserToResendVerification(null);
                            }}
                        >
                            Resend Email
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/* ============================== SESSIONS TAB ============================== */

export function SessionsTab({ project }: { project: Project }) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [sessionToRevoke, setSessionToRevoke] = useState<Session | null>(null);
    const isSessionValid = (session: Session): boolean => {
        const expiresAt = parseServerDate(session.expires_at);

        return !session.revoked_at && !!expiresAt && expiresAt.getTime() > Date.now();
    };
    const validSessionsCount = sessions.filter(isSessionValid).length;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(route('projects.settings.auth.sessions.index', project.id));
            setSessions(res.data.data ?? []);
        } catch { toast.error('Failed to load sessions'); }
        setLoading(false);
    }, [project.id]);

    useEffect(() => { load(); }, [load]);

    const revoke = async (session: Session) => {
        try {
            await axios.post(route('projects.settings.auth.sessions.revoke', [project.id, session.id]));
            toast.success('Session revoked');
            load();
        } catch { toast.error('Failed'); }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold">Sessions</h3>
                <p className="text-sm text-muted-foreground">
                    Inspect valid and expired sessions, then revoke suspicious ones. A session can remain valid even after its current access token expires.
                </p>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                    {sessions.length} stored session{sessions.length !== 1 ? 's' : ''} ({validSessionsCount} can refresh)
                </span>
                <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted/50" />)}</div>
            ) : sessions.length === 0 ? (
                <p className="py-6 text-muted-foreground">No sessions.</p>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">Can Refresh</Badge>
                        <span>Session is valid and can mint a new access token.</span>
                        <Badge variant="outline" className="text-xs">Session Expired</Badge>
                        <span>Refresh window has ended for this session.</span>
                        <Badge variant="outline" className="text-xs">Revoked</Badge>
                        <span>Session was manually invalidated.</span>
                    </div>

                    <div className="overflow-x-auto rounded-md border bg-card">
                    <table className="min-w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-2 text-left">User</th>
                                <th className="px-4 py-2 text-left">IP</th>
                                <th className="px-4 py-2 text-left">Last Activity</th>
                                <th className="px-4 py-2 text-left">Session Expires (Refresh)</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => {
                                const isValid = isSessionValid(s);
                                return (
                                    <tr key={s.id} className="border-t hover:bg-muted/40">
                                        <td className="px-4 py-2">{s.auth_user?.email ?? '—'}</td>
                                        <td className="px-4 py-2">{s.ip_address ?? '—'}</td>
                                        <td className="px-4 py-2 text-xs">{formatDate(s.last_activity_at)}</td>
                                        <td className="px-4 py-2 text-xs">{formatDate(s.expires_at)}</td>
                                        <td className="px-4 py-2">
                                            {isValid ? (
                                                <Badge variant="secondary" className="text-xs">Can Refresh</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">{s.revoked_at ? 'Revoked' : 'Session Expired'}</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {isValid && (
                                                <IconActionButton tooltip="Revoke" variant="ghost" size="icon" onClick={() => setSessionToRevoke(s)}>
                                                    <UserX className="w-4 h-4" />
                                                </IconActionButton>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </div>
            )}

            <AlertDialog open={sessionToRevoke !== null} onOpenChange={(o) => { if (!o) setSessionToRevoke(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke Session</AlertDialogTitle>
                        <AlertDialogDescription>
                            Revoke session for <strong>{sessionToRevoke?.auth_user?.email ?? 'this user'}</strong>? This action signs out that device.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (!sessionToRevoke) return;
                                await revoke(sessionToRevoke);
                                setSessionToRevoke(null);
                            }}
                        >
                            Revoke
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/* ============================== API KEYS TAB ============================== */

export function ApiKeysTab({ project, can }: { project: Project; can: UserCan }) {
    const [keys, setKeys] = useState<UserApiKey[]>([]);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editingKey, setEditingKey] = useState<UserApiKey | null>(null);
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [keyToRevoke, setKeyToRevoke] = useState<UserApiKey | null>(null);
    const [keyToDelete, setKeyToDelete] = useState<UserApiKey | null>(null);
    const [form, setForm] = useState({
        project_auth_user_id: null as number | null,
        name: '',
        scopes: ['read'] as string[],
        expires_at: undefined as Date | undefined,
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [keysRes, usersRes] = await Promise.all([
                axios.get(route('projects.settings.auth.api-keys.index', project.id)),
                axios.get(route('projects.settings.auth.users.index', project.id)),
            ]);
            setKeys(keysRes.data.data ?? []);
            setUsers(usersRes.data.data ?? []);
        } catch {
            toast.error('Failed to load API keys');
        }
        setLoading(false);
    }, [project.id]);

    useEffect(() => { load(); }, [load]);

    const resetForm = () => {
        setEditingKey(null);
        setForm({ project_auth_user_id: null, name: '', scopes: ['read'], expires_at: undefined });
        setErrors({});
        setRevealedKey(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setShowDialog(true);
    };

    const openEditDialog = (key: UserApiKey) => {
        setEditingKey(key);
        setErrors({});
        setRevealedKey(null);
        setForm({
            project_auth_user_id: key.project_auth_user_id,
            name: key.name,
            scopes: key.scopes && key.scopes.length > 0 ? key.scopes : ['read'],
            expires_at: parseServerDate(key.expires_at) ?? undefined,
        });
        setShowDialog(true);
    };

    const saveKey = async () => {
        try {
            const payload = {
                project_auth_user_id: form.project_auth_user_id,
                name: form.name,
                scopes: form.scopes,
                expires_at: form.expires_at ? form.expires_at.toISOString() : null,
            };

            if (editingKey) {
                await axios.put(route('projects.settings.auth.api-keys.update', [project.id, editingKey.id]), payload);
                toast.success('API key updated');
                setShowDialog(false);
                resetForm();
                load();

                return;
            }

            const res = await axios.post(route('projects.settings.auth.api-keys.store', project.id), {
                ...payload,
            });
            setRevealedKey(res.data.plain_text_key);
            toast.success('API key created. Copy it now.');
            load();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                const validationErrors = (error.response.data as { errors?: Record<string, string[]> } | undefined)?.errors;
                setErrors(validationErrors ?? {});
            } else {
                toast.error('Failed to create API key');
            }
        }
    };

    const revokeKey = async () => {
        if (!keyToRevoke) return;
        try {
            await axios.post(route('projects.settings.auth.api-keys.revoke', [project.id, keyToRevoke.id]));
            toast.success('API key revoked');
            setKeyToRevoke(null);
            load();
        } catch {
            toast.error('Failed to revoke API key');
        }
    };

    const deleteKey = async () => {
        if (!keyToDelete) return;
        try {
            await axios.delete(route('projects.settings.auth.api-keys.destroy', [project.id, keyToDelete.id]));
            toast.success('API key deleted');
            setKeyToDelete(null);
            load();
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                toast.error(getErrorMessage(error, 'Only revoked API keys can be deleted'));
            } else {
                toast.error(getErrorMessage(error, 'Failed to delete API key'));
            }
        }
    };

    const copy = (value: string) => {
        navigator.clipboard.writeText(value);
        toast.success('Copied to clipboard');
    };

    const SCOPE_OPTIONS = ['read', 'write', 'admin'];
    const userOptions = users.map((user) => ({
        value: user.id,
        label: user.display_name ? `${user.display_name} <${user.email}>` : user.email,
    }));
    const selectedUserOption = userOptions.find((option) => option.value === form.project_auth_user_id) ?? null;

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold">User API Keys</h3>
                <p className="text-sm text-muted-foreground">Issue user-owned API keys for external app endpoints. Keys are shown once and stored hashed.</p>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
                {can.access_auth_settings && (
                    <Button size="sm" onClick={openCreateDialog}>
                        <Plus className="w-4 h-4 mr-1" /> Create API Key
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted/50" />)}</div>
            ) : keys.length === 0 ? (
                <p className="py-6 text-muted-foreground">No API keys yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border bg-card">
                    <table className="min-w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Prefix</th>
                                <th className="px-4 py-2 text-left">User</th>
                                <th className="px-4 py-2 text-left">Scopes</th>
                                <th className="px-4 py-2 text-left">Last Used</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((key) => (
                                <tr key={key.id} className="border-t hover:bg-muted/40">
                                    <td className="px-4 py-2 font-medium">{key.name}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{key.key_prefix}</td>
                                    <td className="px-4 py-2">{key.auth_user?.email ?? '—'}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {(key.scopes ?? []).map((scope) => (
                                                <Badge key={scope} variant="outline" className="text-xs">{scope}</Badge>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs">{formatDate(key.last_used_at)}</td>
                                    <td className="px-4 py-2">
                                        {key.revoked_at ? (
                                            <Badge variant="destructive" className="text-xs">Revoked</Badge>
                                        ) : key.expires_at && new Date(key.expires_at) < new Date() ? (
                                            <Badge variant="outline" className="text-xs">Expired</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">Active</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {!key.revoked_at ? (
                                            <>
                                                <IconActionButton tooltip="Edit" variant="ghost" size="icon" onClick={() => openEditDialog(key)}>
                                                    <Pencil className="w-4 h-4" />
                                                </IconActionButton>
                                                <IconActionButton tooltip="Revoke" variant="ghost" size="icon" onClick={() => setKeyToRevoke(key)}>
                                                    <Ban className="w-4 h-4" />
                                                </IconActionButton>
                                            </>
                                        ) : (
                                            <IconActionButton tooltip="Delete" variant="ghost" size="icon" onClick={() => setKeyToDelete(key)}>
                                                <Trash2 className="w-4 h-4" />
                                            </IconActionButton>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); resetForm(); } }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingKey ? 'Update User API Key' : 'Create User API Key'}</DialogTitle>
                        <DialogDescription>
                            {editingKey
                                ? 'Update API key metadata. The key secret cannot be changed or shown again.'
                                : 'Create an API key for a project auth user. The raw key is shown once.'}
                        </DialogDescription>
                    </DialogHeader>

                    {revealedKey ? (
                        <div className="space-y-3">
                            <p className="text-sm">Copy this key now. It cannot be displayed again.</p>
                            <div className="flex items-center gap-2">
                                <Input value={revealedKey} readOnly />
                                <Button variant="outline" onClick={() => copy(revealedKey)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>User</Label>
                                <MultiSelect
                                    value={selectedUserOption}
                                    onChange={(option) => setForm({ ...form, project_auth_user_id: option ? Number((option as { value: number }).value) : null })}
                                    options={userOptions}
                                    placeholder="Select user"
                                    isClearable
                                />
                                <InputError message={errors.project_auth_user_id?.[0]} />
                            </div>

                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                <InputError message={errors.name?.[0]} />
                            </div>

                            <div className="space-y-2">
                                <Label>Scopes</Label>
                                <div className="flex flex-wrap gap-3">
                                    {SCOPE_OPTIONS.map((scope) => (
                                        <label key={scope} htmlFor={`api-key-scope-${scope}`} className="flex cursor-pointer items-center gap-2 text-sm">
                                            <Checkbox
                                                id={`api-key-scope-${scope}`}
                                                checked={form.scopes.includes(scope)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setForm({ ...form, scopes: [...form.scopes, scope] });
                                                        return;
                                                    }
                                                    setForm({ ...form, scopes: form.scopes.filter((item) => item !== scope) });
                                                }}
                                            />
                                            {scope}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Expires At (optional)</Label>
                                <DatePicker
                                    date={form.expires_at}
                                    onSelect={(date) => {
                                        const selected = date as Date | undefined;

                                        if (!selected) {
                                            setForm({ ...form, expires_at: undefined });
                                            return;
                                        }

                                        const expiresAt = new Date(selected);
                                        expiresAt.setHours(23, 59, 59, 0);
                                        setForm({ ...form, expires_at: expiresAt });
                                    }}
                                    placeholder="Select expiration date"
                                    className="w-full"
                                />
                                <InputError message={errors.expires_at?.[0]} />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowDialog(false)}>Close</Button>
                        {!revealedKey && (
                            <Button onClick={saveKey} disabled={!form.project_auth_user_id || !form.name.trim()}>
                                {editingKey ? 'Save' : 'Create'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={keyToRevoke !== null} onOpenChange={(open) => { if (!open) setKeyToRevoke(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                            Revoke <strong>{keyToRevoke?.name}</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={revokeKey}>Revoke</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={keyToDelete !== null} onOpenChange={(open) => { if (!open) setKeyToDelete(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Revoked API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{keyToDelete?.name}</strong>? This permanently removes the revoked key record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={deleteKey}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/* ============================== AUDIT TAB ============================== */

export function AuditTab({ project }: { project: Project }) {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filter) params.event_type = filter;
            params.page = String(page);
            const res = await axios.get(route('projects.settings.auth.audit.index', project.id), { params });
            setEvents(res.data.data ?? []);
            setLastPage(Math.max(1, Number(res.data.last_page ?? 1)));
            setTotal(Number(res.data.total ?? 0));
        } catch { toast.error('Failed to load audit log'); }
        setLoading(false);
    }, [project.id, filter, page]);

    useEffect(() => { load(); }, [load]);

    const EVENT_TYPES = [
        '', 'auth.signup.success', 'auth.signup.failed', 'auth.login.success', 'auth.login.failed', 'auth.login.locked',
        'auth.refresh.success', 'auth.refresh.failed', 'auth.logout.success', 'auth.logout_all.success',
    ];

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold">Audit Log</h3>
                <p className="text-sm text-muted-foreground">Track sign-ins, token flows, and suspicious activity flags.</p>
            </div>
            <div className="flex justify-between items-center gap-4">
                <div className="w-full max-w-xs">
                    <Select
                        value={filter || 'all'}
                        onValueChange={(value) => {
                            setFilter(value === 'all' ? '' : value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All events" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All events</SelectItem>
                            {EVENT_TYPES.filter(Boolean).map((t) => (
                                <SelectItem key={t} value={t}>
                                    {t}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted/50" />)}</div>
            ) : events.length === 0 ? (
                <p className="py-6 text-muted-foreground">No audit events.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border bg-card">
                    <table className="min-w-full text-sm">
                        <thead className="border-b bg-muted/40">
                            <tr>
                                <th className="px-4 py-2 text-left">Event</th>
                                <th className="px-4 py-2 text-left">User</th>
                                <th className="px-4 py-2 text-left">IP</th>
                                <th className="px-4 py-2 text-left">Risk</th>
                                <th className="px-4 py-2 text-left">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((e) => (
                                <tr key={e.id} className="border-t hover:bg-muted/40">
                                    <td className="px-4 py-2">
                                        <Badge variant={e.event_type.includes('failed') || e.event_type.includes('locked') ? 'destructive' : 'secondary'} className="text-xs font-mono">
                                            {e.event_type}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-2">
                                        {e.auth_user?.email ? (
                                            e.auth_user.email
                                        ) : typeof e.deleted_user_email === 'string' ? (
                                            <div className="flex items-center gap-2">
                                                <span>{e.deleted_user_email}</span>
                                                <Badge variant="outline" className="text-xs">Deleted user</Badge>
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-2">{e.ip_address ?? '—'}</td>
                                    <td className="px-4 py-2">
                                        {e.risk_flags && e.risk_flags.length > 0 && (
                                            <div className="flex gap-1">
                                                {e.risk_flags.map((f, i) => <Badge key={i} variant="destructive" className="text-xs">{f}</Badge>)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-xs">{formatDate(e.occurred_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {total} event{total !== 1 ? 's' : ''} total
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={loading || page <= 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {lastPage}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                        disabled={loading || page >= lastPage}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
