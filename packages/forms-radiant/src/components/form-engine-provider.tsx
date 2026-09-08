import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import type { FormEngine as CoreFormEngine } from '@schema-engine/forms/engine/form-engine';
import type { FormAdapter } from '../adapters/types';
import { formEngineContext, type FormEngineContextValue } from './provider';

export interface FormEngineProviderProps {
	children: JsxRenderable;
	engine: CoreFormEngine;
	adapter: FormAdapter;
}

function assertProviderProps(engine: CoreFormEngine | undefined, adapter: FormAdapter | undefined): void {
	if (!adapter) {
		throw new Error(
			'FormEngineProvider requires an adapter. Pass radiantAdapter from @schema-engine/forms-radiant/adapters/radiant.',
		);
	}

	if (!engine) {
		throw new Error(
			'FormEngineProvider requires a FormEngine instance. Create one using createRadiantFormEngine()',
		);
	}
}

@customElement('se-form-engine-provider')
export class FormEngineProviderElement extends RadiantElement {
	@prop({ type: Object }) engine!: CoreFormEngine;
	@prop({ type: Object }) adapter!: FormAdapter;

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
	onProviderPropsUpdated(): void {
		this.publishContext();
	}

	private publishContext(): void {
		if (!this.engine || !this.adapter) {
			return;
		}

		this.provider.setContext({ engine: this.engine, adapter: this.adapter });
	}

	override render() {
		return <slot />;
	}
}

export function FormEngineProvider({ children, engine, adapter }: FormEngineProviderProps): JsxRenderable {
	assertProviderProps(engine, adapter);

	return jsx('se-form-engine-provider', {
		'prop:engine': engine,
		'prop:adapter': adapter,
		children,
	});
}

export type { FormEngineContextValue };
