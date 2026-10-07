import FieldBase, { FieldProps } from './FieldBase';
import MultiSelect from "@/admin/components/ui/select/Select";

export default function EnumerationField({ field, value, onChange, processing, errors }: FieldProps) {
    type SelectOption = { value: string; label: string };

    // Get options for the select component
    const getOptions = () => {
        try {
            if (field.options?.enumeration && 
                typeof field.options.enumeration === 'object' &&
                field.options.enumeration.list && 
                Array.isArray(field.options.enumeration.list)) {
                
                return field.options.enumeration.list.map((value: string) => ({
                    value,
                    label: value
                }));
            }
            return [];
        } catch {
            return [];
        }
    };

    const handleChange = (newValue: unknown) => {
        if (field.options?.multiple) {
            const values = Array.isArray(newValue) 
                ? newValue.map((option) => (option as SelectOption).value)
                : [];
            onChange(field, values);
        } else {
            const selectedValue = newValue ? (newValue as SelectOption).value : '';
            onChange(field, selectedValue);
        }
    };

    // Precompute options once per render
    const options = getOptions();

    // Updated formatting relying on existing option references
    const formattedValue = (() => {
        if (!value) {
            return field.options?.multiple ? [] : null;
        }

        // Multiple select handling
        if (field.options?.multiple) {
            const valuesArray = Array.isArray(value) ? value : (() => {
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        return Array.isArray(parsed) ? parsed : value.split(',');
                    } catch {
                        return value.split(',');
                    }
                }
                return [];
            })();

            return valuesArray
                .map((v: string) => options.find(o => o.value === String(v)))
                .filter(Boolean);
        }

        // Single select handling
        const singleVal = Array.isArray(value) ? value[0] : (typeof value === 'string' ? (() => {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed[0] : value;
            } catch {
                return value;
            }
        })() : value);

        return options.find(o => o.value === String(singleVal)) || null;
    })();

    return (
        <FieldBase field={field} value={value} onChange={onChange} processing={processing} errors={errors}>
            <MultiSelect
                isMulti={!!field.options?.multiple}
                value={formattedValue}
                onChange={handleChange}
                isDisabled={processing}
                placeholder={field.placeholder || "Select..."}
                options={options}
                isClearable={!field.required}
            />
        </FieldBase>
    );
} 