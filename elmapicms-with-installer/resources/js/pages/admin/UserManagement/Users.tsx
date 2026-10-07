import { useState, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { toast } from 'sonner';

import { generatePassword } from '@/admin/lib/utils';
import { formatLocalDateTime } from '@/admin/lib/date';

import { BreadcrumbItem, User, Role, UserCan } from '@/admin/types';

import AppLayout from '@/admin/layouts/app-layout';
import UserManagementLayout from './layout';

import { Button } from '@/admin/components/ui/button';
import { Input } from '@/admin/components/ui/input';
import { Badge } from '@/admin/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/admin/components/ui/dialog';
import { Label } from '@/admin/components/ui/label';
import MultiSelect from '@/admin/components/ui/select/Select';
import InputError from '@/admin/components/input-error';
import { Eye, EyeOff, Plus, Lock, KeyRound } from 'lucide-react';
import { DataTable, ColumnFilter, DataTableRef } from '@/admin/components/ui/data-table';

type RoleOption = { value: number; label: string };

const toRoleOptions = (value: unknown): RoleOption[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is RoleOption => {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const candidate = item as { value?: unknown; label?: unknown };
        return typeof candidate.value === 'number' && typeof candidate.label === 'string';
    });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string } | undefined;
        return data?.error ?? fallback;
    }

    return fallback;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Management',
        href: '/admin/user-management/users',
    },
    {
        title: 'Users',
        href: '/admin/user-management/users',
    },
];

interface UsersPageProps {
    roles: Role[];
}

export default function Users({ roles }: UsersPageProps) {
    const can = usePage().props.userCan as UserCan;
    
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openBulkDeleteModal, setOpenBulkDeleteModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [bulkDeletePassword, setBulkDeletePassword] = useState('');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [selectedItems, setSelectedItems] = useState<User[]>([]);
    const [bulkDeleteErrors, setBulkDeleteErrors] = useState<Record<string, string>>({});
    const dataTableRef = useRef<DataTableRef>(null);

    const routePrefix = '/admin/user-management/api/users';
    
    const [formData, setFormData] = useState({
        id: 0,
        name: '',
        email: '',
        password: '',
        roles: [] as number[],
    });
    
    const resetForm = () => {
        setFormData({
            id: 0,
            name: '',
            email: '',
            password: '',
            roles: [],
        });
        setErrors({});
    };
    
    const openNewModal = () => {
        resetForm();
        setEditing(false);
        setOpenModal(true);
    };
    
    const closeModal = () => {
        setOpenModal(false);
        setEditing(false);
        resetForm();
    };
    
    const handleSuccess = () => {
        dataTableRef.current?.fetchData();
    };

    const submitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});
        
        try {
            if (editing) {
                const response = await axios.put(`${routePrefix}/${formData.id}`, formData);
                toast.success(response.data.message);
            } else {
                const response = await axios.post(routePrefix, formData);
                toast.success(response.data.message);
            }
            
            setOpenModal(false);
            setEditing(false);
            resetForm();
            handleSuccess();
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                const data = error.response.data as { errors?: Record<string, string> } | undefined;
                setErrors(data?.errors ?? {});
            } else {
                toast.error('An error occurred');
            }
        } finally {
            setProcessing(false);
        }
    };
    
    const editItem = (item: User) => {
        if (!can.update_users) return;
        
        setFormData({
            id: item.id,
            name: item.name,
            email: item.email,
            password: '',
            roles: item.roles.map(role => role.id),
        });
        
        setEditing(true);
        setOpenModal(true);
    };
    
    const confirmDelete = () => {
        setOpenDeleteModal(true);
    };

    const confirmBulkDelete = () => {
        setOpenBulkDeleteModal(true);
    };
    
    const deleteItem = async () => {
        setProcessing(true);
        
        try {
            const response = await axios.delete(`${routePrefix}/${formData.id}`);
            toast.success(response.data.message);
            setOpenDeleteModal(false);
            closeModal();
            handleSuccess();
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                toast.error(getErrorMessage(error, 'Validation failed'));
                setOpenDeleteModal(false);
            } else {
                toast.error(getErrorMessage(error, 'An error occurred'));
            }
        } finally {
            setProcessing(false);
        }
    };

    const deleteSelected = async () => {
        if (!bulkDeletePassword) {
            toast.error('Please enter your password to confirm deletion');
            return;
        }

        setProcessing(true);
        setBulkDeleteErrors({});
        
        try {
            const response = await axios.post(`${routePrefix}/bulk-delete`, {
                ids: selectedItems.map(item => item.id),
                password: bulkDeletePassword
            });
            toast.success(response.data.message);
            setOpenBulkDeleteModal(false);
            setSelectedItems([]);
            setBulkDeletePassword('');
            handleSuccess();
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 422) {
                const data = error.response.data as { errors?: Record<string, string>; error?: string } | undefined;
                if (data?.errors) {
                    setBulkDeleteErrors(data.errors);
                } else if (data?.error) {
                    toast.error(data.error);
                }
            } else if (axios.isAxiosError(error) && error.response?.status === 403) {
                toast.error('Invalid password');
            } else {
                toast.error('An error occurred while deleting');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleGeneratePassword = () => {
        setFormData(prev => ({
            ...prev,
            password: generatePassword()
        }));
        setShowPassword(true);
    };

    const tableColumns = [
        {
            header: 'Name',
            accessorKey: 'name',
            sortable: true,
            filter: {
                type: 'text' as const,
                placeholder: 'Filter by name...'
            } as ColumnFilter
        },
        {
            header: 'Email',
            accessorKey: 'email',
            sortable: true,
            filter: {
                type: 'text' as const,
                placeholder: 'Filter by email...'
            } as ColumnFilter
        },
        {
            header: 'Roles',
            accessorKey: 'roles',
            filter: {
                type: 'select' as const,
                placeholder: 'Filter by role...',
                options: roles.map(role => ({
                    label: role.name,
                    value: role.id.toString()
                }))
            } as ColumnFilter,
            cell: (item: User) => (
                <div className="flex flex-wrap gap-1">
                    {item.roles.map((role) => (
                        <Badge key={role.id} variant="secondary">
                            {role.name}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            header: 'Created At',
            accessorKey: 'created_at',
            sortable: true,
            filter: {
                type: 'date' as const,
                placeholder: 'Filter by creation date...'
            } as ColumnFilter,
            cell: (item: User) => (
                <div className="text-sm text-muted-foreground">
                    {formatLocalDateTime(item.created_at)}
                </div>
            ),
        },
        {
            header: 'Updated At',
            accessorKey: 'updated_at',
            sortable: true,
            filter: {
                type: 'date' as const,
                placeholder: 'Filter by update date...'
            } as ColumnFilter,
            cell: (item: User) => (
                <div className="text-sm text-muted-foreground">
                    {formatLocalDateTime(item.updated_at)}
                </div>
            ),
        },
    ];

    const tableActionButtons = [
        {
            label: 'Delete Selected',
            onClick: confirmBulkDelete,
            variant: 'destructive' as const,
            show: can.delete_users && selectedItems.length > 0,
        },
        {
            label: 'Create User',
            onClick: openNewModal,
            variant: 'default' as const,
            icon: <Plus className="h-4 w-4" />,
            show: can.create_users,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            
            <UserManagementLayout can={can}>
                <div className="space-y-4">
                    <DataTable
                        ref={dataTableRef}
                        columns={tableColumns}
                        searchPlaceholder="Search users..."
                        searchRoute={routePrefix}
                        actions={tableActionButtons.filter(button => button.show)}
                        selectable={can.delete_users}
                        onSelectionChange={setSelectedItems}
                        selectedItems={selectedItems}
                        pageName="users-table"
                        onRowClick={editItem}
                    />
                </div>
            </UserManagementLayout>
            
            <Dialog open={openModal} onOpenChange={(open) => {
                setOpenModal(open);
                if (!open) {
                    closeModal();
                }
            }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex justify-between items-center">
                            <span>{editing ? 'Edit User' : 'Create New User'}</span>
                            {editing && can.delete_users && (
                                <Button variant="destructive" size="sm" onClick={confirmDelete}>
                                    Delete
                                </Button>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? 'Update user details below' : 'Fill in the form to create a new user'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={submitForm} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="user_name">Name</Label>
                            <Input
                                id="user_name"
                                name="user_name"
                                type="text"
                                autoComplete="off"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="user_email">Email</Label>
                            <Input
                                id="user_email"
                                name="user_email"
                                type="email"
                                autoComplete="off"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                required
                            />
                            <InputError message={errors.email} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="user_password">
                                Password {editing && <span className="text-sm text-muted-foreground">(leave blank to keep current)</span>}
                            </Label>
                            <div className="flex rounded-md">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                                    <Lock className="h-4 w-4" />
                                </span>
                                <Input
                                    id="user_password"
                                    name="user_password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    required={!editing}
                                    className="rounded-none"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-r-md rounded-l-none border border-l-0 border-input bg-muted text-muted-foreground hover:bg-muted"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                        {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-r-md border border-input bg-muted text-muted-foreground hover:bg-muted ml-2"
                                    onClick={handleGeneratePassword}
                                >
                                    <KeyRound className="h-4 w-4" />
                                </Button>
                            </div>
                            <InputError message={errors.password} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="roles">Roles</Label>
                            <MultiSelect
                                isMulti
                                value={roles.map(role => ({
                                    value: role.id,
                                    label: role.name
                                })).filter(option => formData.roles.includes(option.value))}
                                onChange={(selectedOptions: unknown) => {
                                    const selectedRoleIds = toRoleOptions(selectedOptions).map((option) => option.value);
                                    setFormData(prev => ({ ...prev, roles: selectedRoleIds }));
                                }}
                                options={roles.map(role => ({
                                    value: role.id,
                                    label: role.name
                                }))}
                                placeholder="Select roles..."
                            />
                            <InputError message={errors.roles} />
                        </div>
                        
                        <DialogFooter className="pt-4 border-t">
                            <Button type="submit" disabled={processing}>
                                {editing ? 'Update User' : 'Create User'}
                            </Button>
                            <Button type="button" variant="outline" onClick={closeModal}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation Modal */}
            <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to delete this user?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The user will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDeleteModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteItem} disabled={processing}>
                            Delete User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirmation Modal */}
            <Dialog open={openBulkDeleteModal} onOpenChange={(open) => {
                setOpenBulkDeleteModal(open);
                if (!open) {
                    setBulkDeletePassword('');
                    setBulkDeleteErrors({});
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to delete {selectedItems.length} users?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The selected users will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="bulk_delete_confirm_password">Enter your password to confirm</Label>
                            <div className="relative">
                                <Input
                                    id="bulk_delete_confirm_password"
                                    name="bulk_delete_confirm_password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={bulkDeletePassword}
                                    onChange={(e) => setBulkDeletePassword(e.target.value)}
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                            <InputError message={bulkDeleteErrors.password?.[0]} />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setOpenBulkDeleteModal(false);
                            setBulkDeletePassword('');
                            setBulkDeleteErrors({});
                        }}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={deleteSelected} 
                            disabled={processing || !bulkDeletePassword}
                        >
                            Delete Users
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}