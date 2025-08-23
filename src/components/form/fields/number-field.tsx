import { Input } from '../../ui/input';
import { FieldGroup } from '../../field-group';
import { useControlledFormElement, combineHandlers } from '../../../lib/form-engine/hooks/use-field';
import type { NumberFieldConfig } from '../../../lib/form-engine/types/form';

interface NumberFieldProps {
	config: NumberFieldConfig;
	onChange?: (value: number | undefined) => void;
	onBlur?: () => void;
}

/**
 * Number field component
 */
export function NumberField({ config, onChange: propsOnChange, onBlur: propsOnBlur }: NumberFieldProps) {
	const { value, error, onChange, onBlur, fieldProps, isRequired, containerStyles } =
		useControlledFormElement(config);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		const newValue = val === '' ? undefined : Number(val);
		if (val === '' || !Number.isNaN(newValue)) {
			const combinedHandler = combineHandlers(onChange, propsOnChange);
			combinedHandler(newValue);
		}
	};

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
				<Input
					{...fieldProps}
					type="number"
					value={value ?? ''}
					onChange={handleChange}
					onBlur={combineHandlers(onBlur, propsOnBlur)}
					placeholder={config.placeholder}
					min={config.min}
					max={config.max}
					step={config.step}
					className={config.className}
					style={config.style}
				/>
			</FieldGroup>
		</div>
	);
}
