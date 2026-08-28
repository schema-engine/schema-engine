import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { provideContext, type ContextProvider } from '@ecopages/radiant/context';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { stepperContext, type StepperContextValue } from '@/contexts/stepper-context';

@customElement('se-stepper-provider')
export class StepperProviderElement extends RadiantElement {
	@prop({ type: Object }) value!: StepperContextValue;

	@provideContext<typeof stepperContext>({
		context: stepperContext,
		initialValue: {} as StepperContextValue,
	})
	provider!: ContextProvider<typeof stepperContext>;

	protected override onConnected(): void {
		this.publish();
	}

	protected onUpdated(): void {
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

export function StepperProvider({
	value,
	children,
}: {
	value: StepperContextValue;
	children: JsxRenderable;
}): JsxRenderable {
	return jsx('se-stepper-provider', {
		'prop:value': value,
		children,
	});
}
