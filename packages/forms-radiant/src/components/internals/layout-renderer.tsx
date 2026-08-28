import type { JsxRenderable } from '@ecopages/jsx';
import type { FormStep } from '@schema-engine/forms/schemas';
import type { StepLayoutConfig } from '@schema-engine/forms/schemas/form-config';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { formEngineContext, type FormEngineContextValue } from '@/components/provider';
import { LayoutProvider } from '@/components/layout-provider';
import type { LayoutContextValue } from '@/contexts/layout-context';

interface LayoutRendererProps {
	step: FormStep & { layout?: StepLayoutConfig };
	stepMeta?: {
		index: number;
		total: number;
	};
	formMeta: {
		id: string;
		title?: string;
		description?: string;
	};
	children: JsxRenderable;
	engine?: FormEngineContextValue['engine'];
}

function DefaultLayout({ children }: { children: JsxRenderable }) {
	return <div class="form-step-content">{children}</div>;
}

export function LayoutRenderer({ step, stepMeta, formMeta, children, engine }: LayoutRendererProps): JsxRenderable {
	const contextValue: LayoutContextValue = {
		step: stepMeta
			? {
					id: step.id,
					title: step.title,
					description: step.description,
					index: stepMeta.index,
					total: stepMeta.total,
				}
			: {
					id: step.id,
					title: step.title,
					description: step.description,
				},
		form: formMeta,
		config: step.layout ? { ...step.layout } : {},
	};

	if (!step.layout?.$type) {
		return (
			<LayoutProvider value={contextValue}>
				<DefaultLayout>{children}</DefaultLayout>
			</LayoutProvider>
		);
	}

	const { $type, ...layoutConfig } = step.layout;
	const layoutRegistration = engine?.getLayout($type);

	if (!layoutRegistration) {
		return (
			<LayoutProvider value={{ ...contextValue, config: layoutConfig }}>
				<DefaultLayout>{children}</DefaultLayout>
			</LayoutProvider>
		);
	}

	const LayoutComponent = layoutRegistration.render as (props: { children?: JsxRenderable }) => JsxRenderable;

	return (
		<LayoutProvider value={{ ...contextValue, config: layoutConfig }}>
			<LayoutComponent>{children}</LayoutComponent>
		</LayoutProvider>
	);
}

@customElement('se-layout-renderer')
export class LayoutRendererHost extends RadiantElement {
	@prop({ type: Object }) step!: FormStep & { layout?: StepLayoutConfig };
	@prop({ type: Object }) stepMeta?: { index: number; total: number };
	@prop({ type: Object }) formMeta!: { id: string; title?: string; description?: string };

	@contextSelector({ context: formEngineContext })
	engineContext!: FormEngineContextValue;

	override render(): JsxRenderable {
		return (
			<LayoutRenderer
				step={this.step}
				stepMeta={this.stepMeta}
				formMeta={this.formMeta}
				engine={this.engineContext?.engine}
			>
				<slot />
			</LayoutRenderer>
		);
	}
}
