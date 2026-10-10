import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy';
import type { User, Role, Permission } from './user';
import type { Project, Asset, Field, Collection } from './project';
import type { ContentEntry, ColumnDef } from './content';

export type { User, Role, Permission, Project, Asset, Field, Collection, ContentEntry, ColumnDef };

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    branding: {
        app_name: string;
        logo_url: string | null;
        favicon_url: string | null;
        font_family: string;
        theme_radius: string;
        theme_radius_css: string;
        theme_tokens: {
            light?: Record<string, string>;
            dark?: Record<string, string>;
        } | null;
    };
    awsCredentialsConfigured: boolean;
    aiEnabled: boolean;
    aiShowTokenUsage: boolean;
    assetDirectUpload: {
        enabled: boolean;
        multipart_threshold_bytes: number;
    };
    [key: string]: unknown;
}

export interface PageProps {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    errors: Record<string, string>;
    flash: {
        message?: string;
        success?: string;
        error?: string;
    };
}

export interface UserCan {
    [key: string]: boolean;
}
