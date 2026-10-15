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
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormAdapter, FormProviderProps } from '@/adapters/types';
import { resolveFormEngine, whenEngineAvailable } from '@/contexts/resolve-form-engine';
import { radiantAdapter } from '@/adapters/radiant';
import { formEngineContext, type FormEngineContextValue } from '../provider';

export interface FormRendererProps extends Omit<FormProviderProps, 'children'> {
	className?: string;
	style?: Record<string, string | number | undefined>;
	engine?: FormEngine;
	adapter?: FormAdapter;
	/** Rendered inside the form after its fields, for opt-in tools such as FormDebugger. */
	children?: JsxRenderable;
}

/**
 * Behavior host for a composed form.
 *
 * @remarks
 * View-owned shell: the `FormRenderer` view authors the whole form tree as
 * light-DOM children, so SSR expands it without any derived tree here. The host
 * only publishes `formEngineContext`;
 * `engine` / `adapter` / callbacks stay `@state` and are re-attached by the page
 * script, mirroring how `RuiForm` binds `resolver`.
 *
 * @element se-form-renderer
 */
@customElement('se-form-renderer')
export class FormRendererElement extends RadiantElement {
	@state engine?: FormEngine;
	@state adapter?: FormAdapter;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@state onSubmit?: FormProviderProps['onSubmit'];

	@provideContext<typeof formEngineContext>({
		context: formEngineContext,
		initialValue: {} as FormEngineContextValue,
		serialize: () => ({}),
	})
	provider!: ContextProvider<typeof formEngineContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publishContext());
		this.publishContext();
	}

	private unsubscribeActiveEngine?: () => void;

	protected override onConnected(): void {
		if (!this.engine) {
			this.unsubscribeActiveEngine = whenEngineAvailable(this, this.engine, (engine) => {
				if (!this.engine) {
					this.engine = engine;
				}
				this.publishContext();
			});
		}
		if (!this.adapter) {
			this.adapter = radiantAdapter;
		}
		this.publishContext();
	}

	override disconnectedCallback(): void {
		this.unsubscribeActiveEngine?.();
		super.disconnectedCallback();
	}

	@onUpdated(['engine', 'adapter'])
	onEngineUpdated(): void {
		this.publishContext();
	}

	private publishContext(): void {
		const engine = resolveFormEngine(this, this.engine);
		const adapter = this.adapter ?? radiantAdapter;
		if (!engine || !adapter) {
			return;
		}
		this.provider.setContext(this.liveEngineContext);
	}

	/**
	 * Live context facade.
	 *
	 * @remarks
	 * Getters defer to host state so consumers that construct during SSR before
	 * props are applied still resolve the engine and adapter at read time.
	 */
	private get liveEngineContext(): FormEngineContextValue {
		const context = {} as FormEngineContextValue;
		Object.defineProperties(context, {
			engine: {
				get: () => resolveFormEngine(this, this.engine) as FormEngine,
			},
			adapter: {
				get: () => (this.adapter ?? radiantAdapter) as FormAdapter,
			},
		});
		return context;
	}
}
