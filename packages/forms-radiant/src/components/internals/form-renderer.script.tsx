import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '@/adapters/types';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext, type FormEngineContextValue } from '../provider';

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
 * only publishes `formEngineContext`; the app binds `engine` (see `engine`).
 * Submission belongs to `se-form-instance`.
 *
 * @element se-form-renderer
 */
@customElement('se-form-renderer')
export class FormRendererElement extends RadiantElement {
	declare readonly [JSX_PROPS]?: { engine?: FormEngine; defaultValues?: Record<string, unknown> };

	/**
	 * The engine every host below this renderer reads from the context it publishes.
	 *
	 * @remarks
	 * The engine of a server-rendered form is not serialized, so the app binds it by
	 * assigning this property, before or after the renderer upgrades. Hosts below
	 * subscribe to the context, so an engine that arrives or changes later reaches them.
	 *
	 * @remarks
	 * `toAttribute` omits the attribute: Radiant serializes an object prop into the server
	 * markup, and the client would read that plain JSON back over the live engine.
	 */
	@prop({ type: Object, transform: { toAttribute: () => null } }) engine?: FormEngine;
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
	}

	protected override onConnected(): void {
		this.publishContext();
	}

	@onUpdated(['engine'])
	onEngineUpdated(): void {
		this.publishContext();
	}

	private publishContext(): void {
		const engine = resolveFormEngine(this, this.engine);
		if (!engine) {
			return;
		}
		this.provider.setContext({ engine } satisfies FormEngineContextValue);
	}
}
