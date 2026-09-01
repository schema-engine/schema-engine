import { customElement, onUpdated, prop, RadiantElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { viewContext, type ViewContextValue } from '@/contexts/view-context';

@customElement('se-view-provider')
export class ViewProviderElement extends RadiantElement {
	@prop({ type: Object }) value!: ViewContextValue;

	@provideContext<typeof viewContext>({
		context: viewContext,
		initialValue: {} as ViewContextValue,
	})
	provider!: ContextProvider<typeof viewContext>;

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
		if (this.value) this.provider.setContext(this.value);
	}

	override render(): JsxRenderable {
		return <slot />;
	}
}

export function ViewProvider({ value, children }: { value: ViewContextValue; children: JsxRenderable }): JsxRenderable {
	return jsx('se-view-provider', { 'prop:value': value, children });
}
