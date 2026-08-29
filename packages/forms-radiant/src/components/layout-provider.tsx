import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { layoutContext, type LayoutContextValue } from '@/contexts/layout-context';

@customElement('se-layout-provider')
export class LayoutProviderElement extends RadiantElement {
	@prop({ type: Object }) value!: LayoutContextValue;

	@provideContext<typeof layoutContext>({
		context: layoutContext,
		initialValue: {} as LayoutContextValue,
	})
	provider!: ContextProvider<typeof layoutContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => this.publish());
	}

	protected override onConnected(): void {
		this.publish();
	}

	@onUpdated(['value'])
	onValueUpdated(): void {
		this.publish();
	}

	private publish(): void {
		if (this.value) {
			this.provider.setContext(this.value);
		}
	}

	override render(): JsxRenderable {
		return <slot />;
	}
}

export function LayoutProvider({
	value,
	children,
}: {
	value: LayoutContextValue;
	children: JsxRenderable;
}): JsxRenderable {
	return jsx('se-layout-provider', {
		'prop:value': value,
		children,
	});
}
