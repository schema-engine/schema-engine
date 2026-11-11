import './form-array-elements.css';
import { customElement, onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { FormElements } from '@/components/internals/form-elements';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { ArrayElementsProps } from './form-array-elements.types';
import { arrayItemScope, createArrayRowDefault, seedArrayRows, usesScalarArrayItem } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { FormController, FormEngineController } from '@/adapters/radiant/controller';
import { toFieldRules, withContainerState } from '@/lib/field-rules';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { adoptFieldArrayIds } from '@/adapters/radiant/controller/field-array';
import { getValueAtPath, setValueAtPath } from '@schema-engine/forms/lib/path-values';
import { formContext, type FormContextValue } from '@ecopages/radiant-ui/form';
import { mergeFieldGridHost } from '@/hooks/grid-styles';
import { readValue } from '@/adapters/radiant/controller/values';

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

function createInitialArrayValue(config: ArrayElementsProps, values: Record<string, unknown>): unknown[] | undefined {
	const formValue = getValueAtPath(config.initialFormValues ?? {}, config.name);
	const configuredRows = [formValue, config.defaultValue].find(Array.isArray);
	const scalar = usesScalarArrayItem(config, config.name, config.elements, values);
	const rows = seedArrayRows(
		config,
		configuredRows?.map((row) => structuredClone(row)),
		scalar,
	);
	return rows.length || configuredRows ? rows : undefined;
}

interface ArrayContentProps {
	config: ArrayElementsProps;
	engine?: FormEngine;
	ids: readonly string[];
	initialValues: Record<string, unknown>;
	renderValues: Record<string, unknown>;
	fieldError?: string;
}

/**
 * @remarks
 * A disabled array, authored or by a constraint, renders its rows and its add
 * and remove buttons disabled, and its rows get the required marker as a
 * fieldset's children do (`withContainerState`).
 */
function renderArrayContent({ config, engine, ids, initialValues, renderValues, fieldError }: ArrayContentProps) {
	const isSingleField = usesScalarArrayItem(config, config.name, config.elements, renderValues);
	const canAdd = !config.maxItems || ids.length < config.maxItems;
	const canRemove = ids.length > (config.minItems ?? 0);
	const removeLabel = config.removeButtonText || 'Remove item';
	const disabled = config.disabled === true;
	const elements = withContainerState(config, config.elements);

	return (
		<div class="se-form-array">
			{ids.length === 0 ? (
				<p class="se-form-array__empty">{config.emptyStateMessage || 'No items added yet'}</p>
			) : null}
			{ids.map((id, index) => {
				const scope = arrayItemScope(config.name, index, id, {
					scalar: isSingleField,
					parentInstanceId: config.instanceId,
				});
				return (
					<div class="se-form-array__item" key={id} data-se-row-id={id}>
						<div class="se-form-array__fields">
							<FormElements
								elements={elements}
								engine={engine}
								initialValues={initialValues}
								values={renderValues}
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
								disabled={disabled}
								data-action="remove"
								data-id={id}
								aria-label={removeLabel}
							>
								<TrashIcon />
							</RuiButton>
						) : null}
					</div>
				);
			})}
			{canAdd ? (
				<RuiButton
					type="button"
					class="se-form-array__add"
					variant="outline"
					disabled={disabled}
					data-action="add"
				>
					<PlusIcon />
					{config.addButtonText || 'Add item'}
				</RuiButton>
			) : null}
			<p class="rui-field__error" data-rui-field-error role="alert" hidden={!fieldError}>
				{fieldError}
			</p>
		</div>
	);
}

@customElement('se-form-array')
export class SeFormArray extends RadiantElement {
	@prop({ type: Object }) config!: ArrayElementsProps;
	@state fieldError?: string;

	readonly form = new FormController(this);
	private readonly formEngine = new FormEngineController(this);
	private contextEngine?: FormEngine;
	private unregisterArrayField?: () => void;
	private isArrayFieldRegistered = false;
	private formContext?: FormContextValue;
	private initialized = false;
	private initializing = false;
	private preservedHydratedContainer = false;
	private renderedIds: string[] = [];

	@onContextUpdate({ context: formContext, requestUpdate: false })
	onFormContext(value: FormContextValue): void {
		this.formContext = value;
		const fieldError = value.fields[this.config?.name ?? '']?.error;
		if (fieldError !== this.fieldError) {
			this.fieldError = fieldError;
			this.requestUpdate();
		}

		if (!value.ready || !this.config?.name) {
			this.unregisterArrayField?.();
			this.unregisterArrayField = undefined;
			this.isArrayFieldRegistered = false;
			return;
		}
		this.scheduleSync(this.renderedIds.length ? this.renderedIds : this.initialIds());
		this.registerArrayField();
	}

	private registerArrayField(): void {
		const value = this.formContext;
		if (!value?.ready || !this.config?.name || !this.resolveEngine() || this.isArrayFieldRegistered) return;

		const name = this.config.name;
		this.isArrayFieldRegistered = true;
		this.unregisterArrayField = value.actions.register({
			name,
			rules: this.arrayRules(),
			getRules: () => this.arrayRules(),
			defaultValue: this.initialArrayValue(),
			getValue: () => {
				const store = this.form.store;
				return store ? readValue(store.values, name) : undefined;
			},
			setValue: () => {},
		});
	}

	private arrayRules() {
		return toFieldRules(this.config, this.resolveEngine()?.getValidationRegistry());
	}

	private initialArrayValue(): unknown[] | undefined {
		return createInitialArrayValue(this.config, this.currentValues());
	}

	private currentValues(): Record<string, unknown> {
		return this.form.ready ? this.form.getValues() : (this.config.initialFormValues ?? {});
	}

	private rowInitialValues(): Record<string, unknown> {
		const values = structuredClone(this.config.initialFormValues ?? {});
		const arrayValue = this.initialArrayValue();
		if (arrayValue) setValueAtPath(values, this.config.name, arrayValue);
		return values;
	}

	private resolveEngine(): FormEngine | undefined {
		return this.formEngine.engine;
	}

	private get ids(): string[] {
		if (!this.initialized && this.isConnected) {
			const initialIds = this.initialIds();
			if (initialIds.length) return initialIds;
		}
		if (this.form.ready) {
			return this.form.fieldArray(this.config.name).fields.map(({ id }) => id);
		}
		return this.initialIds();
	}

	private initialIds(): string[] {
		return (this.config.ssrInitialRows ?? []).map((_, index) => `seed-${index}`);
	}

	/**
	 * Whether the first hydrated render places the server rows through `this.slotted`.
	 *
	 * @remarks Placing the slotted nodes keeps the server container, so its child controls upgrade against the server rows. Later updates render the current keyed rows normally.
	 */
	private preserveHydratedContainer(): boolean {
		if (this.preservedHydratedContainer || !this.isConnected || !this.isServerRendered) return false;
		this.preservedHydratedContainer = this.slotted !== null;
		return this.preservedHydratedContainer;
	}

	private syncRows(initialIds: readonly string[]): void {
		if (!this.form.ready || this.initializing || !this.config) return;
		if (!this.initialized) {
			this.initialized = true;
			this.initializing = true;
			try {
				const array = this.form.fieldArray(this.config.name);
				const currentIds = array.fields.map(({ id }) => id);
				const count = Math.max(this.config.minItems ?? 0, initialIds.length) - currentIds.length;
				if (count > 0) array.append(Array.from({ length: count }, () => this.emptyItem()));
				const store = this.form.store;
				const seededIds = array.fields.map(({ id }) => id);
				if (store && initialIds.length === seededIds.length) {
					adoptFieldArrayIds(store, this.config.name, initialIds);
				}
			} finally {
				this.initializing = false;
			}
		}
		const ids = this.ids;
		if (ids.length !== this.renderedIds.length || ids.some((id, index) => id !== this.renderedIds[index])) {
			this.renderedIds = ids;
			this.requestUpdate();
		}
	}

	private emptyItem(): unknown {
		const { config } = this;
		return createArrayRowDefault(
			config,
			usesScalarArrayItem(config, config.name, config.elements, this.currentValues()),
		);
	}

	protected override onConnected(): void {
		const initialIds = this.initialIds();
		this.renderedIds = initialIds;
		this.formEngine.connect(() => {
			this.registerArrayField();
			const engine = this.formEngine.engine;
			const engineChanged = this.contextEngine !== undefined && this.contextEngine !== engine;
			this.contextEngine = engine;
			if (!this.isServerRendered || engineChanged) this.requestUpdate();
		});
		this.form.connect(() => this.scheduleSync(initialIds));
		if (this.form.ready) this.scheduleSync(initialIds);
	}

	private scheduleSync(initialIds: readonly string[]): void {
		queueMicrotask(() => this.syncRows(initialIds));
	}

	override disconnectedCallback(): void {
		this.formEngine.disconnect();
		this.form.disconnect();
		this.formContext = undefined;
		this.unregisterArrayField?.();
		this.unregisterArrayField = undefined;
		this.isArrayFieldRegistered = false;
		this.initialized = false;
		this.initializing = false;
		this.renderedIds = [];
		super.disconnectedCallback();
	}

	@onEvent({ type: 'click', selector: '[data-action="add"]' })
	onAdd() {
		const maxItems = this.config.maxItems;
		if (maxItems && this.ids.length >= maxItems) {
			return;
		}
		this.form.fieldArray(this.config.name).append(this.emptyItem());
	}

	@onEvent({ type: 'click', selector: '[data-action="remove"]' })
	onRemove(event: Event) {
		const button = (event.target as HTMLElement).closest('[data-action="remove"]');
		const id = button?.getAttribute('data-id');
		const minItems = this.config.minItems ?? 0;
		if (this.ids.length <= minItems) {
			return;
		}
		const index = this.ids.indexOf(id ?? '');
		if (index >= 0) this.form.fieldArray(this.config.name).remove(index);
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) {
			return null;
		}
		if (this.preserveHydratedContainer()) return this.slotted;
		const engine = this.resolveEngine();
		if (!engine && !this.isConnected) return this.slotted;
		const ids = this.ids;
		if (ids.length > 0 && !engine) return null;
		const renderValues = this.currentValues();
		const initialValues = this.rowInitialValues();

		return renderArrayContent({ config, engine, ids, initialValues, renderValues, fieldError: this.fieldError });
	}
}

/**
 * @remarks
 * The server rows are rendered here and handed to `se-form-array` as children: the host's own view is serialized after
 * the owning render's engine scope has closed, so it cannot render rows itself on the server. The host places them with
 * `this.slotted`, which lets Radiant mark their position instead of serializing a second copy in a slotted template.
 */
export function FormArrayElements(config: ArrayElementsProps) {
	const { ssrInitialRows: _ssrInitialRows, initialFormValues, ...fieldConfig } = config;
	const engine = resolveFormEngine();
	const fieldHost = mergeFieldGridHost(fieldConfig.grid, fieldConfig.style, engine?.getGridTheme().id);
	const initialValues = structuredClone(initialFormValues ?? {});
	const initialRows = createInitialArrayValue({ ...fieldConfig, initialFormValues }, initialValues);
	if (initialRows) setValueAtPath(initialValues, fieldConfig.name, initialRows);
	const arrayConfig = {
		...fieldConfig,
		ssrInitialRows: initialRows ?? [],
		initialFormValues,
	};
	const children = engine
		? renderArrayContent({
				config: arrayConfig,
				engine,
				ids: (initialRows ?? []).map((_, index) => `seed-${index}`),
				initialValues,
				renderValues: initialValues,
			})
		: null;

	return (
		<div class="se-form-field se-form-array-field" data-se-grid-theme={fieldHost.themeId} style={fieldHost.style}>
			{fieldConfig.label ? (
				<p class="se-form-array-field__label">
					{fieldConfig.label}
					{isFieldRequired(fieldConfig.rules) ? <span data-se-required-marker>{' *'}</span> : null}
				</p>
			) : null}
			{fieldConfig.description ? <p class="se-form-array-field__description">{fieldConfig.description}</p> : null}
			{jsx('se-form-array', {
				config: arrayConfig,
				children,
			})}
		</div>
	);
}
