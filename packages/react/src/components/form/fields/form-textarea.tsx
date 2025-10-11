import { Textarea } from '@/shadcn/ui/textarea';
import { FieldGroup } from '@/components/form/field-group';
import { useControlledFormElement, combineHandlers } from '@/hooks';
import type { TextareaFieldProps, TextareaFieldConfig } from './form-textarea.types';
import { TextareaFieldSchema } from './form-textarea.types';
import type { ElementRegistration } from '@json-form-engine/core/types';

export function FormTextarea({
	onChange: propsOnChange,
	onBlur: propsOnBlur,
	onFocus: propsOnFocus,
	...config
}: TextareaFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	return (
		<div style={containerStyles}>
			<FieldGroup
				label={config.label || config.name}
				htmlFor={config.id}
				hiddenLabel={!config.label}
				required={isRequired}
				error={error}
			>
				{config.description && <p className="text-sm text-muted-foreground mb-2">{config.description}</p>}
				<Textarea
					{...fieldProps}
					value={(value as string) || ''}
					onChange={(e) => combineHandlers(onChange, propsOnChange)(e.target.value)}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					onFocus={propsOnFocus}
					placeholder={config.placeholder}
					rows={config.rows}
					cols={config.cols}
					spellCheck={config.spellCheck}
					wrap={config.wrap}
					style={{ resize: config.resize }}
				/>
			</FieldGroup>
		</div>
	);
}

export const TextareaElement: ElementRegistration<TextareaFieldConfig, TextareaFieldProps> = {
	componentId: 'textarea',
	render: FormTextarea,
	schema: TextareaFieldSchema,
	metadata: {
		name: 'Textarea Field',
		description: 'Multi-line text input field',
		category: 'input',
	},
};
