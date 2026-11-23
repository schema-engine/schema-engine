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
import {
	arrayItemScope,
	createArrayRowDefault,
	seedArrayRows,
	usesScalarArrayItem,
	type FormEngineRuntime as FormEngine,
	isFieldRequired,
	getValueAtPath,
	setValueAtPath,
} from '@schema-engine/forms';
import {
	selectFieldState,
	type FormIssueFormatter,
	type FormStateContainer,
} from '@schema-engine/forms/state-container';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { describeIssue } from '@/lib/describe-issue';
import { isRenderedRequired, withContainerState } from '@/lib/field-rules';
import { RequiredMarker } from '../field-group';
import { mergeChildrenGridHost, mergeFieldGridHost } from '@/hooks/grid-styles';
import { GRID_CLASS, GRID_ITEM_CLASS, getAppearanceAttributes } from '@schema-engine/layout';

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

function createInitialArrayValue(config: ArrayElementsProps): unknown[] | undefined {
	const formValue = getValueAtPath(config.initialFormValues ?? {}, config.name);
	const configuredRows = [formValue, config.defaultValue].find(Array.isArray);
	const scalar = usesScalarArrayItem(config, config.elements);
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
 * are built from it, and `config` and `engine` because the row callback runs once per item. A row whose
 * index, config or engine changes is a new object under the same key, so the renderer patches its nodes
 * in place; an unchanged row stays the same object and is skipped.
 */
interface ArrayRow {
	readonly id: string;
	readonly index: number;
	readonly config: ArrayElementsProps;
	readonly engine?: FormEngine;
}

interface ArrayContentProps {
	config: ArrayElementsProps;
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

function renderArrayContent({ config, rows, initialValues, renderValues, fieldError }: ArrayContentProps) {
	const count = computed(() => rows.get().length);
	const maxItems = config.maxItems;
	const disabled = config.disabled === true;

	return (
		<div class="se-form-array">
			{computed(() =>
				count.get() === 0 ? (
					<p class="se-form-array__empty">{config.emptyStateMessage || 'No items added yet'}</p>
				) : null,
			)}
			<MapItems each={rows}>
				{({ id, index, config, engine }) => {
					const removeLabel = config.removeButtonText || 'Remove item';
					const disabled = config.disabled === true;
					const elements = withContainerState(config, config.elements);
					const minItems = config.minItems ?? 0;
					const childrenHost = mergeChildrenGridHost(config.elements, engine);
					const isSingleField = usesScalarArrayItem(config, config.elements);
					const scope = arrayItemScope(config.name, index, id, {
						scalar: isSingleField,
						parentInstanceId: config.instanceId,
					});
					return (
						<div class="se-form-array__item" key={id} data-se-row-id={id}>
							<div
								class={`se-form-array__fields se-form-grid ${GRID_CLASS}`}
								data-se-theme={childrenHost.themeId}
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

	@state private engine?: FormEngine;
	private container?: FormStateContainer;
	private unsubscribeContainer?: () => void;
	private formatIssue?: FormIssueFormatter;
	private preservedHydratedContainer = false;
	private readonly rows = createState<readonly ArrayRow[]>([]);
	private viewHoldsServerRows = false;

	@state private fieldError?: string;

	/**
	 * Follows the form instance's container, which a new config or engine replaces.
	 *
	 * @remarks
	 * The rows come from the container's `rowIds`, so they never get out of step with its values, and the
	 * array's own error is the container's error at the array's path: no `rui-field` wraps the array to
	 * present it, and `rui-form` ignores errors it has no control for.
	 */
	@onContextUpdate({ context: formInstanceContext, requestUpdate: false })
	onFormInstance(value: FormInstanceContextValue | undefined): void {
		this.formatIssue = value?.formatIssue;
		if (value?.container !== this.container) {
			this.unsubscribeContainer?.();
			this.container = value?.container;
			this.unsubscribeContainer = this.container?.subscribe(() => this.syncFromContainer());
		}
		this.syncFromContainer();
	}

	/**
	 * Follows the engine the enclosing renderer publishes, including one bound after this host connected.
	 *
	 * @remarks The rows carry the engine they render with, so an engine that arrives rebuilds them.
	 */
	@onContextUpdate({ context: formEngineContext, select: (context) => context?.engine, requestUpdate: false })
	onRendererEngine(engine: FormEngine | undefined): void {
		if (!engine || this.engine === engine) return;
		this.engine = engine;
		this.syncFromContainer();
	}

	/** Takes the rows and the array's own error from the container's current snapshot. */
	private syncFromContainer(): void {
		const { container, config } = this;
		if (!container || !config?.name) return;
		const snapshot = container.getSnapshot();
		const issue = selectFieldState(snapshot, config.name).error;
		this.fieldError = issue && describeIssue(issue, config.name, this.formatIssue);
		this.describeGroup();
		this.setRows(snapshot.rowIds[config.name] ?? []);
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

	private initialArrayValue(): unknown[] | undefined {
		return createInitialArrayValue(this.config);
	}

	private currentValues(): Record<string, unknown> {
		return this.container?.getSnapshot().values ?? this.config.initialFormValues ?? {};
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

	/** The ids the server rendered, until the container answers with its own, which are the same. */
	private get ids(): readonly string[] {
		return this.container?.getSnapshot().rowIds[this.config.name] ?? this.config.ssrRowIds ?? [];
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

	private renderedIds(): string[] {
		return peek(this.rows).map(({ id }) => id);
	}

	/**
	 * Publishes the row ids to the list signal.
	 *
	 * @remarks
	 * A row whose id, index, config and engine are unchanged keeps its object, so `MapItems` skips it. The first
	 * hydrated render places the server rows through `this.slotted` and has no list mounted, so the first
	 * change of the ids after it renders the host once to mount the list in their place. An engine arriving
	 * alone leaves the server rows in place; a config change re-runs `render`, which reads `config`, so the
	 * list is mounted with the new config.
	 */
	private setRows(ids: readonly string[]): void {
		const { config } = this;
		const engine = this.resolveEngine();
		const current = peek(this.rows);
		const known = new Map(current.map((row) => [row.id, row]));
		const next = ids.map((id, index) => {
			const row = known.get(id);
			return row?.index === index && row.config === config && row.engine === engine
				? row
				: { id, index, config, engine };
		});
		if (next.length === current.length && next.every((row, index) => row === current[index])) return;
		this.rows.set(next);
		const sameShape = next.length === current.length && next.every((row, index) => row.id === current[index]?.id);
		if (this.viewHoldsServerRows && !sameShape) {
			this.viewHoldsServerRows = false;
			this.requestUpdate();
		}
	}

	private emptyItem(): unknown {
		const { config } = this;
		return createArrayRowDefault(config, usesScalarArrayItem(config, config.elements));
	}

	protected override onConnected(): void {
		this.engine ??= resolveFormEngine(this);
		this.setRows(this.ids);
	}

	override disconnectedCallback(): void {
		this.engine = undefined;
		this.unsubscribeContainer?.();
		this.unsubscribeContainer = undefined;
		this.container = undefined;
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
		if (!this.ownsControl(event) || !this.container) return;
		const maxItems = this.config.maxItems;
		if (maxItems && this.ids.length >= maxItems) {
			return;
		}
		this.container.fieldArray(this.config.name).append(this.emptyItem());
	}

	@onEvent({ type: 'click', selector: '.se-form-array__remove' })
	onRemove(event: Event): void {
		if (!this.ownsControl(event) || !this.container) return;
		const id = (event.target as Element).closest('[data-se-row-id]')?.getAttribute('data-se-row-id');
		if (this.ids.length <= (this.config.minItems ?? 0)) {
			return;
		}
		const index = this.ids.indexOf(id ?? '');
		if (index >= 0) this.container.fieldArray(this.config.name).remove(index);
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
		this.setRows(this.renderedIds());
		const renderValues = this.currentValues();
		const initialValues = this.rowInitialValues();

		return renderArrayContent({
			config,
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
	const { ssrInitialRows: _ssrInitialRows, ssrRowIds, initialFormValues, ...fieldConfig } = config;
	const engine = resolveFormEngine();
	const fieldHost = mergeFieldGridHost(fieldConfig.grid, fieldConfig.style, engine?.getLayout().id);
	const initialValues = structuredClone(initialFormValues ?? {});
	const initialRows = createInitialArrayValue({ ...fieldConfig, initialFormValues });
	if (initialRows) setValueAtPath(initialValues, fieldConfig.name, initialRows);
	const arrayConfig = {
		...fieldConfig,
		ssrInitialRows: initialRows ?? [],
		ssrRowIds: ssrRowIds ?? [],
		initialFormValues,
	};
	const children = engine
		? renderArrayContent({
				config: arrayConfig,
				rows: createState<readonly ArrayRow[]>(
					arrayConfig.ssrRowIds.map((id, index) => ({ id, index, config: arrayConfig, engine })),
				),
				initialValues,
				renderValues: initialValues,
			})
		: null;

	return (
		<fieldset
			classes={['se-form-field', GRID_ITEM_CLASS, 'se-form-array-field', fieldConfig.className]}
			aria-label={fieldConfig.label ? undefined : fieldConfig.name}
			data-se-theme={fieldHost.themeId}
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

declare global {
	interface HTMLElementTagNameMap {
		'se-form-array': SeFormArray;
	}
}
