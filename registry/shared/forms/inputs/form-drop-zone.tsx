/** @jsxImportSource react */
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/ui/schema-engine/components/drop-zone';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement, combineHandlers } from '@schema-engine/forms-react/hooks';
import type { DropZoneFieldProps } from './form-drop-zone.types';

export function FormDropZone({ onChange: propsOnChange, onDropChange, ...config }: DropZoneFieldProps) {
	const { value, error, onChange, fieldProps, isRequired, containerStyles, gridThemeId } = useControlledFormElement({
		...config,
		defaultValue: config.defaultValue ?? [],
	});

	const { accept, maxSize, minSize, maxFiles, disabled } = config;

	const normalizedValue = Array.isArray(value) ? value : undefined;

	const handleDrop = (acceptedFiles: File[]) => {
		combineHandlers(onChange, propsOnChange)?.(acceptedFiles);
		onDropChange?.(acceptedFiles);
	};

	return (
		<FieldGroup
			gridThemeId={gridThemeId}
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			required={isRequired}
			description={config.description}
			error={error}
			style={containerStyles}
		>
			<Dropzone
				{...fieldProps}
				accept={accept}
				maxSize={maxSize}
				minSize={minSize}
				maxFiles={maxFiles}
				disabled={disabled}
				src={normalizedValue}
				onDrop={handleDrop}
			>
				<DropzoneEmptyState />
				<DropzoneContent />
			</Dropzone>
		</FieldGroup>
	);
}
