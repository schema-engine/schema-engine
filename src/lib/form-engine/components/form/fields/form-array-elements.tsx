import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useControlledFormElement } from '@/lib/form-engine/hooks/use-field';
import { FormElement } from '@/lib/form-engine/components/internals/field-renderer';
import type { ArrayElementsConfig } from './form-array-elements.types';
import type { FieldConfig } from '@/lib/form-engine/types/form';

interface FormArrayElementsProps {
	config: ArrayElementsConfig;
	onChange?: (value: any[]) => void;
	onBlur?: () => void;
}

/**
 * Array field component that manages dynamic arrays of form fields
 * Uses React Hook Form's useFieldArray for proper array state management
 * Supports both single field type arrays and complex multi-field objects
 * Follows the enhanced field system pattern
 */
export function FormArrayElements({ config, onChange }: FormArrayElementsProps) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: config.name,
	});

	const { fieldState, labelProps, errorProps, containerStyles } = useControlledFormElement(config);

	const handleAdd = () => {
		const defaultValue = config.elements.reduce(
			(acc, element) => {
				acc[element.name] = createFieldDefaultValue(element as FieldConfig);
				return acc;
			},
			{} as Record<string, any>,
		);
		append(defaultValue);
		onChange?.(fields.concat(defaultValue));
	};

	const handleRemove = (index: number) => {
		remove(index);
		const newValues = fields.filter((_, i) => i !== index);
		onChange?.(newValues);
	};

	const canAdd = !config.maxItems || fields.length < config.maxItems;
	const canRemove = !config.minItems || fields.length > config.minItems;

	const isSingleField = config.elements.length === 1;
	const firstElement = config.elements[0];

	return (
		<div className="space-y-2" style={containerStyles}>
			{config.label && <Label {...labelProps}>{config.label}</Label>}

			{config.description && <p className="text-sm text-muted-foreground">{config.description}</p>}

			<div className="space-y-4">
				<div className="space-y-3">
					{fields.map((field, index) => (
						<Card key={field.id} className="p-4">
							<div className="flex items-start gap-3">
								<div className="flex-1">
									{isSingleField && firstElement ? (
										<FormElement
											//@ts-expect-error Need to fix typing, elements should be defined and test at compiletime
											config={{
												...firstElement,
												name: `${config.name}.${index}`,
												id: `${firstElement.id}_${index}`,
											}}
										/>
									) : (
										<div className="space-y-4">
											{config.elements.map((elementConfig, elementIndex) => (
												<FormElement
													key={`${elementConfig.id}_${index}_${elementIndex}`}
													//@ts-expect-error Need to fix typing, elements should be defined and test at compiletime
													config={{
														...elementConfig,
														name: `${config.name}.${index}.${elementConfig.name}`,
														id: `${elementConfig.id}_${index}_${elementIndex}`,
													}}
												/>
											))}
										</div>
									)}
								</div>

								{canRemove && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => handleRemove(index)}
										className="mt-1"
										aria-label={config.removeButtonText || 'Remove item'}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						</Card>
					))}
				</div>

				{fields.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">No items added yet</div>
				)}

				{canAdd && (
					<Button type="button" variant="outline" onClick={handleAdd} className="w-full">
						<Plus className="h-4 w-4 mr-2" />
						{config.addButtonText || 'Add item'}
					</Button>
				)}
			</div>

			{errorProps && <div {...errorProps}>{fieldState.error?.message}</div>}
		</div>
	);
}

/**
 * Creates a default value for a single field configuration
 */
function createFieldDefaultValue(config: FieldConfig): any {
	if (config.defaultValue !== undefined) {
		return config.defaultValue;
	}

	switch (config.componentId) {
		case 'input':
			return '';
		case 'number':
			return 0;
		case 'textarea':
			return '';
		case 'select':
			return config.multiple ? [] : '';
		case 'checkbox':
			return false;
		case 'radio':
			return '';
		case 'switch':
			return false;
		case 'arrayElements':
			return [];
		default:
			return '';
	}
}
