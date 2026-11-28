import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import type { FormIssueFormatter } from '@schema-engine/forms/state-container';
import type {
	FormEngineRuntime as FormEngine,
	DefaultValuesOf,
	FormValues,
	NormalizedFormConfig,
	FormConfig,
	FormActionTrigger,
	SubmissionActionResult,
} from '@schema-engine/forms';
import type { FormAction, FormSubmitContext } from '@/adapters/types.js';
import { resolveFormEngine } from '@/contexts/resolve-form-engine.js';
import { formEngineContext, type FormEngineContextValue } from '../provider.js';

/**
 * Props of the Radiant `FormRenderer` view.
 *
 * @template TValues - The values the form submits, which a normalized `config` carries (`engine.defineForm` of a literal config, or `engine.validateForm(json, { values })`): `onSubmit`, `onAction` and `defaultValues` are typed by it, with no annotation. A config passed as authoring input has none, so they are {@link FormValues}. `onChange` is always {@link FormValues}: live values may hold excluded and unfinished data.
 */
export interface FormRendererProps<TValues extends FormValues = FormValues> {
	/**
	 * The form: the normalized config of `engine.defineForm` or `engine.validateForm`, or an authoring config.
	 *
	 * @remarks An authoring config carries no values type, so it is accepted only where `TValues` is {@link FormValues}: a callback typed by other values needs a normalized config that says so.
	 */
	config:
		| NormalizedFormConfig<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>, TValues>
		| (FormValues extends TValues ? FormConfig : never);
	/** Values the form starts from, over the defaults of its fields. */
	defaultValues?: DefaultValuesOf<NoInfer<TValues>>;
	/** Native destination of the form: with no `onSubmit` the form posts to `action` with `method` once its actions succeed. */
	action?: string;
	method?: string;
	/** Called with the values that passed validation and matched the form's value schemas, after the submit actions. */
	onSubmit?: (data: TValues, context: FormSubmitContext) => void | Promise<void>;
	onChange?: (data: FormValues) => void;
	onAction?: (action: FormAction, data: TValues) => void | Promise<void>;
	/**
	 * Called with the results of every trigger that ran actions, and once with those of the submit actions, as React's `onActionResults` is.
	 *
	 * @remarks The same results reach the `se-action-results` event, which also serves a page that has no `FormRenderer` callback, such as a form rendered on the server.
	 */
	onActionResults?: (results: readonly SubmissionActionResult[], trigger: FormActionTrigger) => void | Promise<void>;
	/**
	 * Takes the page to the `redirectUrl` a submit action asked for, once the whole submission succeeded.
	 *
	 * @remarks Defaults to `location.assign` in a browser and does nothing on a server. It replaces the native post of a form with `action`, since the redirect is where the page goes next.
	 */
	navigate?: (url: string) => void;
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
