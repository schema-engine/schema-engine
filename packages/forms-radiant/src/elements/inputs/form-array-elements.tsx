import './form-array-elements.css';
import { customElement, onEvent, prop, RadiantElement, state } from '@ecopages/radiant';
import { onContextUpdate } from '@ecopages/radiant/context';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiFieldError } from '@ecopages/radiant-ui/field';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { MapItems } from '@ecopages/jsx/client';
import { computed, peek, state as createState, type State } from '@ecopages/signals';
import { FormElements } from '@/components/internals/form-elements';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext } from '@/components/provider';
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

/**
 * One row of the array, as `MapItems` receives it.
 *
 * @remarks
 * `index` is part of the row because the row's field names (`contacts.0.role`) and its remove label
 * are built from it. A row whose index moves is a new object under the same key, so the renderer
 * patches its nodes in place; a row whose index is unchanged stays the same object and is skipped.
 */
interface ArrayRow {
	readonly id: string;
	readonly index: number;
}

interface ArrayContentProps {
	config: ArrayElementsProps;
	engine?: FormEngine;
	rows: State<readonly ArrayRow[]>;
	initialValues: Record<string, unknown>;
	renderValues: Record<string, unknown>;
	fieldError?: string;
}

/**
 * @remarks
 * The error region is a controlled `RuiFieldError`: no `rui-field` wraps the array to fill it, so the
 * array passes its message as `error`. Its `id` is what the owning fieldset's `aria-describedby` points
 * at while the array has an error.
 *
 * A disabled array, authored or by a constraint, renders its rows and its add
 * and remove buttons disabled, and its rows get the required marker as a
 * fieldset's children do (`withContainerState`).
 */
function arrayErrorId(config: ArrayElementsProps): string {
	return `${config.instanceId ?? config.id ?? config.name}-error`;
}

function renderArrayContent({ config, engine, rows, initialValues, renderValues, fieldError }: ArrayContentProps) {
	const isSingleField = usesScalarArrayItem(config, config.name, config.elements, renderValues);
	const count = computed(() => rows.get().length);
	const removeLabel = config.removeButtonText || 'Remove item';
	const disabled = config.disabled === true;
	const elements = withContainerState(config, config.elements);
	const minItems = config.minItems ?? 0;
	const maxItems = config.maxItems;

	return (
		<div class="se-form-array">
			{computed(() =>
				count.get() === 0 ? (
					<p class="se-form-array__empty">{config.emptyStateMessage || 'No items added yet'}</p>
				) : null,
			)}
			<MapItems each={rows}>
				{({ id, index }) => {
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
							{computed(() =>
								count.get() > minItems ? (
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
								) : null,
							)}
						</div>
					);
				}}
			</MapItems>
			{computed(() =>
				!maxItems || count.get() < maxItems ? (
					<RuiButton type="button" class="se-form-array__add" variant="outline" disabled={disabled}>
						<PlusIcon />
						{config.addButtonText || 'Add item'}
					</RuiButton>
				) : null,
			)}
			<RuiFieldError id={arrayErrorId(config)} error={fieldError ?? ''} />
		</div>
	);
}

@customElement('se-form-array')
export class SeFormArray extends RadiantElement {
	declare readonly [JSX_PROPS]?: { config: ArrayElementsProps };

	@prop({ type: Object }) config!: ArrayElementsProps;

	readonly form = new FormController(this);
	@state private engine?: FormEngine;
	private unregisterArrayField?: () => void;
	private isArrayFieldRegistered = false;
	private initialized = false;
	private preservedHydratedContainer = false;
	private readonly rows = createState<readonly ArrayRow[]>([]);
	private viewHoldsServerRows = false;

	@state private fieldError?: string;
	private formContextValue?: FormContextValue;

	@onContextUpdate({ context: formContext, requestUpdate: false })
	onFormContext(value: FormContextValue): void {
		this.formContextValue = value;
		this.fieldError = value.fields[this.config?.name ?? '']?.error;
		this.describeGroup();
		if (!value.ready || !this.config?.name) {
			this.unregisterArrayField?.();
			this.unregisterArrayField = undefined;
			this.isArrayFieldRegistered = false;
			return;
		}
		this.scheduleSync(this.renderedIds().length ? this.renderedIds() : this.initialIds());
		this.registerArrayField(value);
	}

	/**
	 * Follows the engine the enclosing renderer publishes, including one bound after this host connected.
	 *
	 * @remarks
	 * The array registers with the form and seeds its rows only once it has an engine, so the
	 * form context it already received is replayed when the engine arrives.
	 */
	@onContextUpdate({ context: formEngineContext, select: (context) => context?.engine, requestUpdate: false })
	onRendererEngine(engine: FormEngine | undefined): void {
		if (!engine || this.engine === engine) return;
		this.engine = engine;
		const value = this.formContextValue;
		if (!value?.ready || !this.config?.name) return;
		this.scheduleSync(this.renderedIds().length ? this.renderedIds() : this.initialIds());
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
	 * Read from the renderer's context (see {@link onRendererEngine}). A host that is not connected is
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
		this.viewHoldsServerRows = this.preservedHydratedContainer;
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
		this.setRows(ids);
	}

	private renderedIds(): string[] {
		return peek(this.rows).map(({ id }) => id);
	}

	/**
	 * Publishes the row ids to the list signal.
	 *
	 * @remarks
	 * A row whose id and index are unchanged keeps its object, so `MapItems` skips it. The first
	 * hydrated render places the server rows through `this.slotted` and has no list mounted, so the first
	 * change after it renders the host once to mount the list in their place.
	 */
	private setRows(ids: readonly string[]): void {
		const current = peek(this.rows);
		if (ids.length === current.length && ids.every((id, index) => id === current[index]?.id)) return;
		const known = new Map(current.map((row) => [row.id, row]));
		this.rows.set(
			ids.map((id, index) => {
				const row = known.get(id);
				return row?.index === index ? row : { id, index };
			}),
		);
		if (this.viewHoldsServerRows) {
			this.viewHoldsServerRows = false;
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
		this.setRows(initialIds);
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
		this.rows.set([]);
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
		if (!engine && this.renderedIds().length > 0) return null;
		const renderValues = this.currentValues();
		const initialValues = this.rowInitialValues();

		return renderArrayContent({
			config,
			engine,
			rows: this.rows,
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
				rows: createState<readonly ArrayRow[]>(
					(initialRows ?? []).map((_, index) => ({ id: `seed-${index}`, index })),
				),
				initialValues,
				renderValues: initialValues,
			})
		: null;

	return (
		<fieldset
			class="se-form-field se-form-array-field"
			aria-label={fieldConfig.label ? undefined : fieldConfig.name}
			data-se-grid-theme={fieldHost.themeId}
			style={fieldHost.style}
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
