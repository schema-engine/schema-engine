import './form-array-elements.css';
import { onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { RuiButton } from '@ecopages/radiant-ui/button';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { FormElements } from '@/components/internals/form-elements';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import type { ArrayElementsProps } from './form-array-elements.types';
import { arrayItemScope, createArrayRowDefault, seedArrayRows, usesScalarArrayItem } from '@schema-engine/forms';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import { FormController } from '@/adapters/radiant/controller';
import { isRenderedRequired, toFieldRules, withContainerState } from '@/lib/field-rules';
import { isFieldRequired } from '@schema-engine/forms/schemas/validation/utils';
import { RequiredMarker } from '../field-group';
import { adoptFieldArrayIds } from '@/adapters/radiant/controller/field-array';
import { getValueAtPath, setValueAtPath } from '@schema-engine/forms/lib/path-values';
import { formContext, type FormContextValue } from '@ecopages/radiant-ui/form';
import { mergeChildrenGridHost, mergeFieldGridHost } from '@/hooks/grid-styles';
import { getAppearanceAttributes } from '@schema-engine/layout';
import { readValue } from '@/adapters/radiant/controller/values';
import { formElement } from '@/lib/define-element';

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
 * The error region stamps the contract `RuiFieldError` does, by hand: that view passes its children
 * through but is always rendered hidden, and no `rui-field` wraps the array to reveal it. Its `id`
 * is what the owning fieldset's `aria-describedby` points at while the array has an error.
 *
 * A disabled array, authored or by a constraint, renders its rows and its add
 * and remove buttons disabled, and its rows get the required marker as a
 * fieldset's children do (`withContainerState`).
 */
function arrayErrorId(config: ArrayElementsProps): string {
	return `${config.instanceId ?? config.id ?? config.name}-error`;
}

function renderArrayContent({ config, engine, ids, initialValues, renderValues, fieldError }: ArrayContentProps) {
	const isSingleField = usesScalarArrayItem(config, config.name, config.elements, renderValues);
	const canAdd = !config.maxItems || ids.length < config.maxItems;
	const canRemove = ids.length > (config.minItems ?? 0);
	const removeLabel = config.removeButtonText || 'Remove item';
	const disabled = config.disabled === true;
	const elements = withContainerState(config, config.elements);
	const childrenHost = mergeChildrenGridHost(config.elements, engine);

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
						<div
							class="se-form-array__fields se-form-grid"
							data-se-grid-theme={childrenHost.themeId}
							style={childrenHost.style}
						>
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
								aria-label={`${removeLabel} ${index + 1}`}
							>
								<TrashIcon />
							</RuiButton>
						) : null}
					</div>
				);
			})}
			{canAdd ? (
				<RuiButton type="button" class="se-form-array__add" variant="outline" disabled={disabled}>
					<PlusIcon />
					{config.addButtonText || 'Add item'}
				</RuiButton>
			) : null}
			<p
				class="rui-field__error"
				id={arrayErrorId(config)}
				data-rui-field-error
				role="alert"
				hidden={!fieldError}
			>
				{fieldError}
			</p>
		</div>
	);
}

@formElement('se-form-array')
export class SeFormArray extends RadiantElement {
	declare readonly [JSX_PROPS]?: { config: ArrayElementsProps };

	@prop({ type: Object }) config!: ArrayElementsProps;

	readonly form = new FormController(this);
	@state private engine?: FormEngine;
	private unregisterArrayField?: () => void;
	private isArrayFieldRegistered = false;
	private initialized = false;
	private preservedHydratedContainer = false;
	private renderedIds: string[] = [];

	@state private fieldError?: string;

	@onContextUpdate({ context: formContext, requestUpdate: false })
	onFormContext(value: FormContextValue): void {
		this.fieldError = value.fields[this.config?.name ?? '']?.error;
		this.describeGroup();
		if (!value.ready || !this.config?.name) {
			this.unregisterArrayField?.();
			this.unregisterArrayField = undefined;
			this.isArrayFieldRegistered = false;
			return;
		}
		this.scheduleSync(this.renderedIds.length ? this.renderedIds : this.initialIds());
		this.registerArrayField(value);
	}

	/**
	 * @remarks
	 * The fieldset is rendered by `FormArrayElements`, outside this host's view, so its
	 * `aria-describedby` is written here, only while the error region has text.
	 */
	private describeGroup(): void {
		const group = this.parentElement;
		if (!group?.matches('fieldset') || !this.config) return;
		if (this.fieldError) group.setAttribute('aria-describedby', arrayErrorId(this.config));
		else group.removeAttribute('aria-describedby');
	}

	/**
	 * @remarks
	 * Registering publishes `formContext` again, synchronously, so the flag is set before the call.
	 */
	private registerArrayField(value: FormContextValue): void {
		if (this.isArrayFieldRegistered || !this.resolveEngine()) return;

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

	/**
	 * @remarks
	 * Resolved once, in `onConnected`, like the other hosts. A host that is not connected is
	 * being rendered by the owning render, which is the only place its engine can come from.
	 */
	private resolveEngine(): FormEngine | undefined {
		return this.engine ?? (this.isConnected ? undefined : resolveFormEngine(this));
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
		if (!this.form.ready || !this.config) return;
		if (!this.initialized) {
			this.initialized = true;
			const array = this.form.fieldArray(this.config.name);
			const currentIds = array.fields.map(({ id }) => id);
			const count = Math.max(this.config.minItems ?? 0, initialIds.length) - currentIds.length;
			if (count > 0) array.append(Array.from({ length: count }, () => this.emptyItem()));
			const store = this.form.store;
			const seededIds = array.fields.map(({ id }) => id);
			if (store && initialIds.length === seededIds.length) {
				adoptFieldArrayIds(store, this.config.name, initialIds);
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
		this.engine ??= resolveFormEngine(this);
		const initialIds = this.initialIds();
		this.renderedIds = initialIds;
		if (this.form.ready) this.scheduleSync(initialIds);
	}

	private scheduleSync(initialIds: readonly string[]): void {
		queueMicrotask(() => this.syncRows(initialIds));
	}

	override disconnectedCallback(): void {
		this.engine = undefined;
		this.form.disconnect();
		this.unregisterArrayField?.();
		this.unregisterArrayField = undefined;
		this.isArrayFieldRegistered = false;
		this.initialized = false;
		this.renderedIds = [];
		super.disconnectedCallback();
	}

	/**
	 * @remarks
	 * The buttons are not wired in the view: the first hydrated render adopts server markup that carries no handlers,
	 * so the host listens for them. `closest('se-form-array')` must be this host, or a nested array's buttons would
	 * also add to or remove from the outer array.
	 */
	@onEvent({ type: 'click', selector: '.se-form-array__add' })
	onAdd(event: Event): void {
		if (!this.ownsControl(event)) return;
		const maxItems = this.config.maxItems;
		if (maxItems && this.ids.length >= maxItems) {
			return;
		}
		this.form.fieldArray(this.config.name).append(this.emptyItem());
	}

	@onEvent({ type: 'click', selector: '.se-form-array__remove' })
	onRemove(event: Event): void {
		if (!this.ownsControl(event)) return;
		const id = (event.target as Element).closest('[data-se-row-id]')?.getAttribute('data-se-row-id');
		if (this.ids.length <= (this.config.minItems ?? 0)) {
			return;
		}
		const index = this.ids.indexOf(id ?? '');
		if (index >= 0) this.form.fieldArray(this.config.name).remove(index);
	}

	private ownsControl(event: Event): boolean {
		return (event.target as Element | null)?.closest('se-form-array') === this;
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

		return renderArrayContent({
			config,
			engine,
			ids,
			initialValues,
			renderValues,
			fieldError: this.fieldError,
		});
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
		<fieldset
			classes={['se-form-field', 'se-form-array-field', fieldConfig.className]}
			aria-label={fieldConfig.label ? undefined : fieldConfig.name}
			data-se-grid-theme={fieldHost.themeId}
			style={fieldHost.style}
			{...getAppearanceAttributes(fieldConfig.appearance)}
		>
			{fieldConfig.label ? (
				<legend class="se-form-array-field__label">
					{fieldConfig.label}
					<RequiredMarker required={isFieldRequired(fieldConfig.rules) || isRenderedRequired(fieldConfig)} />
				</legend>
			) : null}
			{fieldConfig.description ? <p class="se-form-array-field__description">{fieldConfig.description}</p> : null}
			<SeFormArray config={arrayConfig}>{children}</SeFormArray>
		</fieldset>
	);
}
