import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import type { ArrayFieldConfig, FieldConfig } from '@/lib/form-engine/types/form';
import { DynamicField } from '@/lib/form-engine/components/internals/field-renderer';

interface ArrayFieldProps {
	config: ArrayFieldConfig;
}

/**
 * Array field component that manages dynamic arrays of form fields
 * Uses React Hook Form's useFieldArray for proper array state management
 * Supports both single field type arrays and complex multi-field objects
 */
export function ArrayField({ config }: ArrayFieldProps) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: config.name,
	});

	const handleAdd = () => {
		const defaultValue = createDefaultValue(config.elements);
		append(defaultValue);
	};

	const handleRemove = (index: number) => {
		remove(index);
	};

	const canAdd = !config.maxItems || fields.length < config.maxItems;
	const canRemove = !config.minItems || fields.length > config.minItems;

	const isSingleField = config.elements.length === 1;
	const firstElement = config.elements[0];

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				{fields.map((field, index) => (
					<Card key={field.id} className="p-4">
						<div className="flex items-start gap-3">
							<div className="flex-1">
								{isSingleField && firstElement ? (
									<DynamicField
										config={{
											...firstElement,
											name: `${config.name}.${index}`,
											id: `${firstElement.id}_${index}`,
										}}
									/>
								) : (
									<div className="space-y-4">
										{config.elements.map((elementConfig, elementIndex) => (
											<DynamicField
												key={`${elementConfig.id}_${index}_${elementIndex}`}
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

			{fields.length === 0 && <div className="text-center py-8 text-muted-foreground">No items added yet</div>}

			{canAdd && (
				<Button type="button" variant="outline" onClick={handleAdd} className="w-full">
					<Plus className="h-4 w-4 mr-2" />
					{config.addButtonText || 'Add item'}
				</Button>
			)}
		</div>
	);
}

/**
 * Creates a default value for field configurations
 * Supports both single field and multi-field array elements
 */
function createDefaultValue(elements: FieldConfig[]): any {
	if (elements.length === 1 && elements[0]) {
		return createFieldDefaultValue(elements[0]);
	}

	const defaultObj: Record<string, any> = {};
	elements.forEach((element) => {
		defaultObj[element.name] = createFieldDefaultValue(element);
	});
	return defaultObj;
}

/**
 * Creates a default value for a single field configuration
 */
function createFieldDefaultValue(config: FieldConfig): any {
	if (config.defaultValue !== undefined) {
		return config.defaultValue;
	}

	switch (config.type) {
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
		case 'date':
			return '';
		case 'file':
			return null;
		case 'switch':
			return false;
		case 'array':
			return [];
		default:
			return '';
	}
}
