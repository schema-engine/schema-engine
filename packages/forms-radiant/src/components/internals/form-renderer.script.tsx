import { onUpdated, prop, RadiantElement, registerSsrPreparationCallback, state } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '@/adapters/types';
import { logger } from '@/lib/logger';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext, type FormEngineContextValue } from '../provider';
import { formElement } from '@/lib/define-element';

export interface FormRendererProps extends Omit<FormProviderProps, 'children'> {
	class?: string;
	style?: Record<string, string | number | undefined>;
	engine?: FormEngine;
	/** Rendered inside the form after its fields, for opt-in tools such as FormDebugger. */
	children?: JsxRenderable;
}

/**
 * Behavior host for a composed form.
 *
 * @remarks
 * View-owned shell: the `FormRenderer` view authors the whole form tree as
 * light-DOM children, so SSR expands it without any derived tree here. The host
 * only publishes `formEngineContext`; the app binds `engine` before the renderer
 * upgrades (see `engine`). Submission belongs
 * to `se-form-instance`.
 *
 * @element se-form-renderer
 */
@formElement('se-form-renderer')
export class FormRendererElement extends RadiantElement {
	@state private boundEngine?: FormEngine;
	private publishedEngine?: FormEngine;
	private reportedReplacement = false;
	/**
	 * The engine every host below this renderer resolves at connect time.
	 *
	 * @remarks
	 * The engine of a server-rendered form is not serialized, so the app binds it
	 * explicitly, before the renderer's children connect: assign it to an element
	 * that is not upgraded yet (still detached from its document, or before
	 * `se-form-renderer` is defined), and the renderer adopts it when it upgrades.
	 * The children then resolve it from the context the renderer publishes on connect.
	 * A host resolves it once, at connect, and never waits for a later one; a host
	 * without an engine reports a configuration error. Replacing it after connect
	 * is reported once and does not reach hosts that already resolved.
	 *
	 * This is an accessor over private state, not a decorated field, because a
	 * field would replace the value assigned before the upgrade when the element is constructed.
	 */
	get engine(): FormEngine | undefined {
		return this.boundEngine;
	}
	set engine(engine: FormEngine | undefined) {
		this.boundEngine = engine;
	}
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;

	@provideContext<typeof formEngineContext>({
		context: formEngineContext,
		initialValue: {},
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formEngineContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publishContext());
		this.adoptEngineAssignedBeforeUpgrade();
	}

	/**
	 * @remarks
	 * Assigning `engine` to an element before its class is defined creates an own
	 * property that shadows the accessor, so it is removed and assigned again.
	 */
	private adoptEngineAssignedBeforeUpgrade(): void {
		if (!Object.hasOwn(this, 'engine')) return;
		const { engine } = this;
		Reflect.deleteProperty(this, 'engine');
		this.engine = engine;
	}

	protected override onConnected(): void {
		this.publishContext();
	}

	/**
	 * @remarks
	 * Hosts below resolve their engine once, at connect, so replacing a bound engine
	 * on a connected renderer cannot reach them: it is reported once and the published
	 * context follows only for hosts that connect afterwards.
	 */
	@onUpdated(['boundEngine'])
	onEngineUpdated(): void {
		const replaced = this.publishedEngine && this.boundEngine && this.publishedEngine !== this.boundEngine;
		if (replaced && this.isConnected && !this.reportedReplacement) {
			this.reportedReplacement = true;
			logger.warn(
				'The engine changed after `se-form-renderer` connected. Hosts below keep the engine they resolved at connect: bind the engine before the renderer connects.',
			);
		}
		this.publishContext();
	}

	private publishContext(): void {
		const engine = resolveFormEngine(this, this.engine);
		if (!engine) {
			return;
		}
		this.publishedEngine = engine;
		this.provider.setContext({ engine } satisfies FormEngineContextValue);
	}
}
