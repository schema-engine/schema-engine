import './card-layout.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { layoutContext } from '@/contexts/layout-context';
import type { CardLayoutConfig } from './card-layout.types';

function layoutClassName(...parts: Array<string | false | undefined>) {
	return parts.filter(Boolean).join(' ');
}

@customElement('se-card-layout')
export class CardLayoutElement extends RadiantElement {
	@prop({ type: String }) layoutClass = '';

	@contextSelector({ context: layoutContext })
	layoutContext!: {
		step: { title?: string; description?: string; index?: number; total?: number };
		form: { title?: string; description?: string };
		config: CardLayoutConfig;
	};

	override render(): JsxRenderable {
		const { step, form, config } = this.layoutContext ?? {
			step: {},
			form: {},
			config: {},
		};
		const maxWidth = config.maxWidth ?? 'md';
		const padding = config.padding ?? 'md';
		const shadowSize = config.shadowSize ?? 'md';
		const title = step?.title || form?.title;
		const description = step?.description || form?.description;

		return (
			<div class={layoutClassName('card-layout', this.layoutClass || undefined)}>
				<div
					class={layoutClassName(
						'card-layout__card',
						`card-layout__card--${maxWidth}`,
						`card-layout__shadow--${shadowSize}`,
					)}
				>
					{title || description || (typeof step?.index === 'number' && typeof step?.total === 'number') ? (
						<div class={layoutClassName('card-layout__header', `card-layout__padding--${padding}`)}>
							{title ? <h2 class="card-layout__title">{title}</h2> : null}
							{description ? <p class="card-layout__description">{description}</p> : null}
							{typeof step?.index === 'number' && typeof step?.total === 'number' ? (
								<small class="card-layout__step-counter">
									Step {step.index + 1} of {step.total}
								</small>
							) : null}
						</div>
					) : null}
					<div class={layoutClassName('card-layout__content', `card-layout__padding--${padding}`)}>
						<slot />
					</div>
				</div>
			</div>
		);
	}
}

export function CardLayout({ children, className }: { children?: JsxRenderable; className?: string }) {
	return jsx('se-card-layout', {
		'prop:layoutClass': className ?? '',
		children,
	});
}
