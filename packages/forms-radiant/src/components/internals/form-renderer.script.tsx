import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '@/adapters/types';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext, type FormEngineContextValue } from '../provider';

export interface FormRendererProps extends Omit<FormProviderProps, 'children'> {
	class?: string;
	style?: Record<string, string | number | undefined>;
	engine?: FormEngine;
	/**
	 * Turns an issue into the text to show, for the application's language, for every form of this renderer; it replaces the engine's `formatIssue`.
	 *
	 * @remarks
	 * It receives the issue (`type`, `ruleId`, `params`, `source` and any `message`) and the path of its field, and
	 * returns the text; `rui-form` falls back to the issue's own `message` when it returns nothing. Without a
	 * formatter an issue shows its `message` and otherwise nothing, never the rule type. The same function type
	 * serves the React renderer.
	 */
	formatIssue?: FormIssueFormatter;
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
	declare readonly [JSX_PROPS]?: {
		engine?: FormEngine;
		defaultValues?: Record<string, unknown>;
		formatIssue?: FormIssueFormatter;
	};

	/**
	 * The engine every host below this renderer reads from the context it publishes.
	 *
	 * @remarks
	 * The engine of a server-rendered form is not serialized, so the app binds it by
	 * assigning this property, before or after the renderer upgrades. Hosts below
	 * subscribe to the context, so an engine that arrives or changes later reaches them.
	 *
	 * @remarks
	 * Property-only (`attribute: false`): a live engine is never serialized into the server markup.
	 */
	@prop({ type: Object, attribute: false }) engine?: FormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	/**
	 * Turns an issue into text for every form below this renderer, in place of the engine's `formatIssue`; the one override a form has.
	 *
	 * @remarks Property-only (`attribute: false`): a function is never serialized into the server markup.
	 */
	@prop({ type: Object, attribute: false }) formatIssue?: FormIssueFormatter;

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

	@onUpdated(['engine', 'formatIssue'])
	onEngineUpdated(): void {
		this.publishContext();
	}

	private publishContext(): void {
		const engine = resolveFormEngine(this, this.engine);
		if (!engine) {
			return;
		}
		this.provider.setContext({ engine, formatIssue: this.formatIssue } satisfies FormEngineContextValue);
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'se-form-renderer': FormRendererElement;
	}
}
