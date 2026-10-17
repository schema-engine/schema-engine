import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { FieldGroup } from '@/components/ui/schema-engine/components/field';
import { useControlledFormElement } from '@schema-engine/forms-react/hooks';
import { useFieldArray, useFormContext } from '@schema-engine/forms-react/adapters';
import { FormElements } from '@schema-engine/forms-react/primitives';
import { arrayItemScope, createArrayRowDefault, usesScalarArrayItem } from '@schema-engine/forms';
import type { ElementConfig } from '@schema-engine/forms/schemas';
import type { ArrayElementsProps } from './form-array-elements.types';
import { cn } from '@/components/schema-engine/forms/lib/utils';

interface ArrayItemProps {
	index: number;
	instanceId: string;
	config: ArrayElementsProps;
	scalar: boolean;
	canRemove: boolean;
	disabled: boolean;
	removeButtonText?: string;
	onRemove: (index: number) => void;
}

function ArrayItem({
	index,
	instanceId,
	config,
	scalar,
	canRemove,
	disabled,
	removeButtonText,
	onRemove,
}: ArrayItemProps) {
	const scope = arrayItemScope(config.name, index, instanceId, {
		scalar,
		parentInstanceId: config.instanceId,
	});

	return (
		<div className={cn('space-y-3 p-4 border border-border rounded-lg')}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1">
					<FormElements
						elements={config.elements}
						namePrefix={scope.namePrefix}
						nameStrategy={scope.nameStrategy}
						instanceId={scope.instanceId}
					/>
				</div>

				{canRemove && (
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						disabled={disabled}
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
	config: ArrayElementsProps;
	scalar: boolean;
	canRemove: boolean;
	disabled: boolean;
	removeButtonText?: string;
	emptyStateMessage: string;
	onRemove: (index: number) => void;
}

function ArrayItemsList({
	fields,
	config,
	scalar,
	canRemove,
	disabled,
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
					instanceId={field.id}
					config={config}
					scalar={scalar}
					canRemove={canRemove}
					disabled={disabled}
					removeButtonText={removeButtonText}
					onRemove={onRemove}
				/>
			))}
		</div>
	);
}

interface ArrayActionsProps {
	canAdd: boolean;
	disabled: boolean;
	addButtonText?: string;
	onAdd: () => void;
}

function ArrayActions({ canAdd, disabled, addButtonText, onAdd }: ArrayActionsProps) {
	if (!canAdd) {
		return null;
	}

	return (
		<Button type="button" variant="outline" disabled={disabled} onClick={onAdd} className="w-full">
			<Plus />
			{addButtonText || 'Add item'}
		</Button>
	);
}

/**
 * Array field that manages dynamic lists of form fields.
 * Field paths and instance ids are composed at render time.
 *
 * @remarks A disabled array disables its add and remove buttons; its rows are disabled by the renderer.
 */
export function FormArrayElements(config: ArrayElementsProps) {
	const { fields, append, remove } = useFieldArray(config.name);
	const { getValues } = useFormContext();

	const { fieldState, containerStyles } = useControlledFormElement(config as unknown as ElementConfig);

	const scalar = usesScalarArrayItem(config, config.name, config.elements, getValues());

	const disabled = Boolean(config.disabled);

	const handleAdd = () => {
		append(createArrayRowDefault(config, scalar));
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
					scalar={scalar}
					canRemove={canRemove}
					disabled={disabled}
					removeButtonText={removeButtonText}
					emptyStateMessage={emptyStateMessage}
					onRemove={handleRemove}
				/>

				<ArrayActions canAdd={canAdd} disabled={disabled} addButtonText={addButtonText} onAdd={handleAdd} />
			</div>
		</FieldGroup>
	);
}
