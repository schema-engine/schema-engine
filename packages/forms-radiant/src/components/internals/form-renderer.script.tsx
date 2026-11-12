import {
	customElement,
	onUpdated,
	prop,
	RadiantElement,
	registerSsrPreparationCallback,
	state,
} from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import type { JsxRenderable } from '@ecopages/jsx';
import type { FormEngineRuntime as FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormProviderProps } from '@/adapters/types';
import { resolveFormEngine } from '@/contexts/resolve-form-engine';
import { formEngineContext, type FormEngineContextValue } from '../provider';

export interface FormRendererProps extends Omit<FormProviderProps, 'children'> {
	className?: string;
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
 * only publishes `formEngineContext`; `engine` stays `@state` and is re-attached
 * by the page script, mirroring how `RuiForm` binds `resolver`. Submission belongs
 * to `se-form-instance`.
 *
 * @element se-form-renderer
 */
@customElement('se-form-renderer')
export class FormRendererElement extends RadiantElement {
	@state engine?: FormEngine;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;

	@provideContext<typeof formEngineContext>({
		context: formEngineContext,
		initialValue: {} as FormEngineContextValue,
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
