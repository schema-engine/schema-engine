import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/core-ui/drop-zone';
import { FieldGroup } from '@/components/elements/field-group';
import { useAdapterControlledFormElement } from '@/hooks';
import type { DropZoneFieldProps } from './form-drop-zone.types';

export function FormDropZone({ onChange: propsOnChange, onDropChange, ...config }: DropZoneFieldProps) {
	const { value, error, onChange, fieldProps, isRequired, containerStyles, combineHandlers } =
		useAdapterControlledFormElement({
			...config,
			defaultValue: config.defaultValue ?? [],
		});

	const { accept, maxSize, minSize, maxFiles = 1, disabled } = config;

	const normalizedValue = Array.isArray(value) ? value : undefined;

	const handleDrop = (acceptedFiles: File[]) => {
		combineHandlers(onChange, propsOnChange)?.(acceptedFiles);
		onDropChange?.(acceptedFiles);
	};

	return (
		<FieldGroup
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
