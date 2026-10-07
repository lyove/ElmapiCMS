/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Field, SharedData } from "@/admin/types";
import { usePage } from '@inertiajs/react';

import { Label } from "@/admin/components/ui/label";
import InputError from '@/admin/components/input-error';
import AiFieldButton from '@/admin/components/ai-field-button';

export interface FieldProps {
    field: Field;
    value: any;
    onChange: (field: Field, value: any, index?: number) => void;
    processing: boolean;
    errors: Record<string, string>;
    projectId?: number;
    fieldId?: string; // Optional unique ID for fields in groups to avoid duplicate IDs
    locales?: string[];
    collectionName?: string;
}

export default function FieldBase({ field, value, onChange, children, errors, fieldId, locales, collectionName }: React.PropsWithChildren<FieldProps>) {
    const uniqueId = fieldId || field.name;
    const getFieldError = (index?: number) => {
        if (!errors) return undefined;
        if (field.options?.repeatable && typeof index === 'number') {
            const error = errors[`data.${field.name}.${index}.value`];
            return error ? (Array.isArray(error) ? error[0] : String(error)) : undefined;
        }
        
        // Check for errors with validation rule suffixes (Laravel format)
        // Common validation rule suffixes - check all possible validation types
        const validationSuffixes = ['required', 'email', 'numeric', 'color', 'between', 'min', 'max', 'string', 'array'];
        
        // Check with data. prefix first (for top-level fields)
        for (const suffix of validationSuffixes) {
            const errorKey = `data.${field.name}.${suffix}`;
            if (errors[errorKey]) {
                const error = errors[errorKey];
                return Array.isArray(error) ? error[0] : String(error);
            }
        }
        
        // Check base key with data. prefix (fallback)
        if (errors[`data.${field.name}`]) {
            const error = errors[`data.${field.name}`];
            return Array.isArray(error) ? error[0] : String(error);
        }
        
        // Check for just the field name (for nested fields in groups)
        if (errors[field.name]) {
            const error = errors[field.name];
            return Array.isArray(error) ? error[0] : String(error);
        }
        
        // Also check if there are any errors that start with the field name (catch-all)
        // This handles cases where Laravel might return errors in different formats
        for (const key in errors) {
            if (key.startsWith(`data.${field.name}.`) || key === field.name) {
                const error = errors[key];
                if (error) {
                    return Array.isArray(error) ? error[0] : String(error);
                }
            }
        }
        
        return undefined;
    };

    const { aiEnabled } = usePage<SharedData>().props;
    const showAiButton = aiEnabled && ['text', 'longtext'].includes(field.type) && !field.options?.repeatable;

    return (
        <div className="gap-2">
            <div className="flex items-center justify-between mb-2">
                <Label htmlFor={uniqueId}>
                    <span className="font-medium text-md">{field.label}</span>
                    {field.validations?.required?.status && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="flex items-center gap-1">
                    {showAiButton && (
                        <AiFieldButton
                            value={typeof value === 'string' ? value : ''}
                            onChange={(newVal) => onChange(field, newVal)}
                            context={{ field_name: field.name, field_label: field.label, collection_name: collectionName }}
                            locales={locales}
                        />
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-300 ml-1">
                        #<span className="select-all">{field.name}</span>
                    </span>
                </div>
            </div>
            {children}
            {!field.options?.repeatable && (
                <InputError message={getFieldError()} />
            )}
            {field.description && (
                <p className="text-sm text-gray-500">{field.description}</p>
            )}
        </div>
    );
} 