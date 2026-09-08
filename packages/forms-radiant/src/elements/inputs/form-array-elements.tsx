import './form-array-elements.css';
import '@ecopages/radiant-ui/button/styles.css';
import { customElement, onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { FormElements } from '@/components/internals/form-elements';
import { getFieldGridStyles } from '@/hooks/grid-styles';
import type { ArrayElementsProps } from '@/registry/forms/inputs/form-array-elements.types';
import { arrayItemScope } from '@schema-engine/forms';

function TrashIcon() {
	return (
		<svg
			class="se-form-array__icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M3 6h18" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			<path d="M10 11v6" />
			<path d="M14 11v6" />
		</svg>
	);
}

function PlusIcon() {
	return (
		<svg
			class="se-form-array__icon"
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M12 5v14" />
			<path d="M5 12h14" />
		</svg>
	);
}

@customElement('se-form-array')
export class SeFormArray extends RadiantElement {
	@prop({ type: Object }) config!: ArrayElementsProps;

	@state ids: number[] = [];
	@state nextId = 0;

	protected override onConnected(): void {
		const minItems = this.config?.minItems ?? 0;
		if (this.ids.length === 0 && minItems > 0) {
			this.ids = Array.from({ length: minItems }, (_, index) => index);
			this.nextId = minItems;
		}
	}

	@onEvent({ type: 'click', selector: '[data-action="add"]' })
	onAdd() {
		const maxItems = this.config.maxItems;
		if (maxItems && this.ids.length >= maxItems) {
			return;
		}
		this.ids = [...this.ids, this.nextId];
		this.nextId += 1;
	}

	@onEvent({ type: 'click', selector: '[data-action="remove"]' })
	onRemove(event: Event) {
		const button = (event.target as HTMLElement).closest('[data-action="remove"]');
		const id = Number(button?.getAttribute('data-id'));
		const minItems = this.config.minItems ?? 0;
		if (this.ids.length <= minItems) {
			return;
		}
		this.ids = this.ids.filter((itemId) => itemId !== id);
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) {
			return null;
		}

		const isSingleField = config.elements.length === 1;
		const canAdd = !config.maxItems || this.ids.length < config.maxItems;
		const canRemove = this.ids.length > (config.minItems ?? 0);
		const removeLabel = config.removeButtonText || 'Remove item';

		return (
			<div class="se-form-array">
				{this.ids.length === 0 ? (
					<p class="se-form-array__empty">{config.emptyStateMessage || 'No items added yet'}</p>
				) : null}
				{this.ids.map((id, index) => {
					const scope = arrayItemScope(config.name, index, String(id), {
						scalar: isSingleField,
						parentInstanceId: config.instanceId,
					});
					return (
						<div class="se-form-array__item" key={id}>
							<div class="se-form-array__fields">
								<FormElements
									elements={config.elements}
									namePrefix={scope.namePrefix}
									nameStrategy={scope.nameStrategy}
									instanceId={scope.instanceId}
								/>
							</div>
							{canRemove ? (
								<RuiButton
									type="button"
									class="se-form-array__remove"
									variant="outline"
									size="sm"
									square
									data-action="remove"
									data-id={String(id)}
									aria-label={removeLabel}
								>
									<TrashIcon />
								</RuiButton>
							) : null}
						</div>
					);
				})}
				{canAdd ? (
					<RuiButton type="button" class="se-form-array__add" variant="outline" data-action="add">
						<PlusIcon />
						{config.addButtonText || 'Add item'}
					</RuiButton>
				) : null}
			</div>
		);
	}
}

export function FormArrayElements(config: ArrayElementsProps) {
	return (
		<div class="se-form-array-field" style={{ ...getFieldGridStyles(config.grid), ...config.style }}>
			{config.label ? <p class="se-form-array-field__label">{config.label}</p> : null}
			{config.description ? <p class="se-form-array-field__description">{config.description}</p> : null}
			{jsx('se-form-array', { 'prop:config': config })}
		</div>
	);
}
