import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { FormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormAdapter, FormProviderProps } from '@/adapters/types';
import { FormProvider } from '@/adapters/radiant/form-provider';
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
 * Host that authors `<rui-form>` / `<rui-field>` from `render()`.
 *
 * Radiant-ui binds `rules` and `resolver` as object props (`prop:rules`, `prop:resolver`).
 * Those do not survive HTML/slot projection. Rendering the form tree here is what makes
 * validation work the same as a raw RuiForm story.
 */
@customElement('se-form-renderer')
export class FormRendererElement extends RadiantElement {
	@prop({ type: Object }) config!: FormConfig;
	@prop({ type: Object }) engine?: FormEngine;
	@prop({ type: Object }) adapter?: FormAdapter;
	@prop({ type: Object }) defaultValues?: Record<string, unknown>;
	@prop({ type: Object }) extras?: JsxRenderable;
	onSubmit?: FormProviderProps['onSubmit'];

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

	@onUpdated(['engine', 'adapter'])
	onEngineUpdated(): void {
		this.publishContext();
	}

	private publishContext(): void {
		if (!this.engine || !this.adapter) {
			return;
		}
		this.provider.setContext({ engine: this.engine, adapter: this.adapter });
	}

	override render(): JsxRenderable {
		const config = this.config;
		if (!config) {
			return null;
		}

		return (
			<FormProvider
				config={config}
				defaultValues={this.defaultValues}
				onSubmit={this.onSubmit}
				children={this.extras}
				engine={this.engine}
			/>
		);
	}
}

export function FormRenderer({
	engine,
	adapter,
	className = '',
	style,
	children,
	...props
}: FormRendererProps): JsxRenderable {
	if (!engine || !adapter) {
		return (
			<div class={`se-form-renderer ${className}`.trim()} style={style}>
				<FormProvider {...props} engine={engine}>
					{children}
				</FormProvider>
			</div>
		);
	}

	return jsx('se-form-renderer', {
		class: `se-form-renderer ${className}`.trim(),
		style,
		'prop:config': props.config,
		'prop:engine': engine,
		'prop:adapter': adapter,
		'prop:defaultValues': props.defaultValues,
		'prop:onSubmit': props.onSubmit,
		'prop:extras': children,
	});
}

export { FormElementsRenderer } from './form-elements-renderer';
