import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement } from '@schema-engine/forms-react/hooks';
import { useFieldArray } from '@schema-engine/forms-react/adapters';
import { FormElement } from '@schema-engine/forms-react/primitives';
import type { ArrayElementsProps, ArrayElementsConfig } from './form-array-elements.types';
import { cn } from '@/components/schema-engine/forms/lib/utils';

interface ArrayItemProps {
	index: number;
	config: ArrayElementsConfig;
	isSingleField: boolean;
	firstElement?: FormEngine.ElementConfig;
	canRemove: boolean;
	removeButtonText?: string;
	onRemove: (index: number) => void;
}

function ArrayItem({
	index,
	config,
	isSingleField,
	firstElement,
	canRemove,
	removeButtonText,
	onRemove,
}: ArrayItemProps) {
	return (
		<div className={cn('space-y-3 p-4 border border-border rounded-lg')}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1">
					{isSingleField && firstElement ? (
						<FormElement
							config={
								{
									...firstElement,
									name: `${config.name}.${index}`,
									id: firstElement.id ? `${firstElement.id}_${index}` : undefined,
								} as FormEngine.ElementConfig
							}
						/>
					) : (
						<div className="space-y-4">
							{config.elements.map((elementConfig, elementIndex) => (
								<FormElement
									key={`${elementConfig.id || elementConfig.$type}_${index}_${elementIndex}`}
									config={
										{
											...elementConfig,
											name: `${config.name}.${index}.${elementConfig.name}`,
											id: elementConfig.id
												? `${elementConfig.id}_${index}_${elementIndex}`
												: undefined,
										} as FormEngine.ElementConfig
									}
								/>
							))}
						</div>
					)}
				</div>

				{canRemove && (
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						onClick={() => onRemove(index)}
						aria-label={removeButtonText || 'Remove item'}
					>
						<Trash2 />
					</Button>
				)}
			</div>
		</div>
	);
}

interface ArrayItemsListProps {
	fields: Array<{ id: string }>;
	config: ArrayElementsConfig;
	isSingleField: boolean;
	firstElement?: FormEngine.ElementConfig;
	canRemove: boolean;
	removeButtonText?: string;
	emptyStateMessage: string;
	onRemove: (index: number) => void;
}

function ArrayItemsList({
	fields,
	config,
	isSingleField,
	firstElement,
	canRemove,
	removeButtonText,
	emptyStateMessage,
	onRemove,
}: ArrayItemsListProps) {
	if (fields.length === 0) {
		return <div className="text-center py-8 text-muted-foreground text-sm">{emptyStateMessage}</div>;
	}

	return (
		<div className="space-y-3">
			{fields.map((field, index) => (
				<ArrayItem
					key={field.id}
					index={index}
					config={config}
					isSingleField={isSingleField}
					firstElement={firstElement}
					canRemove={canRemove}
					removeButtonText={removeButtonText}
					onRemove={onRemove}
				/>
			))}
		</div>
	);
}

interface ArrayActionsProps {
	canAdd: boolean;
	addButtonText?: string;
	onAdd: () => void;
}

function ArrayActions({ canAdd, addButtonText, onAdd }: ArrayActionsProps) {
	if (!canAdd) {
		return null;
	}

	return (
		<Button type="button" variant="outline" onClick={onAdd} className="w-full">
			<Plus />
			{addButtonText || 'Add item'}
		</Button>
	);
}

/**
 * Array field component that manages dynamic arrays of form fields
 * Uses React Hook Form's useFieldArray for proper array state management
 * Supports both single field type arrays and complex multi-field objects
 * Base UI implementation without shadcn/ui dependencies
 */
export function FormArrayElements(config: ArrayElementsProps) {
	const { fields, append, remove } = useFieldArray(config.name);

	const { fieldState, containerStyles } = useControlledFormElement(config as unknown as FormEngine.ElementConfig);

	const isSingleField = config.elements.length === 1;
	const firstElement = config.elements[0];

	const createDefaultValues = () => {
		if (isSingleField && firstElement) {
			return config.initialValues ?? '';
		}

		const defaults = config.elements.reduce(
			(acc, element) => {
				if (element.name) {
					acc[element.name] = '';
				}
				return acc;
			},
			{} as Record<string, any>,
		);

		return { ...defaults, ...config.initialValues };
	};

	const handleAdd = () => {
		append(createDefaultValues());
	};

	const handleRemove = (index: number) => {
		remove(index);
	};

	const canAdd = !config.maxItems || fields.length < config.maxItems;
	const canRemove = !config.minItems || fields.length > config.minItems;

	const emptyStateMessage = config.emptyStateMessage || 'No items added yet';
	const addButtonText = config.addButtonText || 'Add item';
	const removeButtonText = config.removeButtonText || 'Remove item';

	return (
		<FieldGroup
			label={config.label || config.name}
			htmlFor={config.id}
			hiddenLabel={!config.label}
			description={config.description}
			error={fieldState.error?.message}
			style={containerStyles}
		>
			<div className="space-y-4">
				<ArrayItemsList
					fields={fields}
					config={config}
					isSingleField={isSingleField}
					firstElement={firstElement}
					canRemove={canRemove}
					removeButtonText={removeButtonText}
					emptyStateMessage={emptyStateMessage}
					onRemove={handleRemove}
				/>

				<ArrayActions canAdd={canAdd} addButtonText={addButtonText} onAdd={handleAdd} />
			</div>
		</FieldGroup>
	);
}
