import './hero-background-layout.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { layoutContext } from '@/contexts/layout-context';
import type { HeroBackgroundLayoutConfig } from './hero-background-layout.types';

function layoutClassName(...parts: Array<string | false | undefined>) {
	return parts.filter(Boolean).join(' ');
}

@customElement('se-hero-background-layout')
export class HeroBackgroundLayoutElement extends RadiantElement {
	@prop({ type: String }) layoutClass = '';

	@contextSelector({ context: layoutContext })
	layoutContext!: {
		step: { title?: string; description?: string; index?: number; total?: number };
		form: { title?: string; description?: string };
		config: HeroBackgroundLayoutConfig;
	};

	override render(): JsxRenderable {
		const { step, form, config } = this.layoutContext ?? {
			step: {},
			form: {},
			config: {},
		};
		const contentWidth = config.contentWidth ?? 'md';
		const title = step?.title || form?.title;
		const description = step?.description || form?.description;

		return (
			<div
				class={layoutClassName('hero-background-layout', this.layoutClass || undefined)}
				style={{
					backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
				}}
			>
				{config.backgroundVideo ? (
					<video autoplay muted loop class="hero-background-layout__video">
						<source src={config.backgroundVideo} type="video/mp4" />
					</video>
				) : null}
				<div class="hero-background-layout__overlay" />
				<div
					class={layoutClassName(
						'hero-background-layout__content',
						`hero-background-layout__content--${contentWidth}`,
					)}
				>
					{title || description || (typeof step?.index === 'number' && typeof step?.total === 'number') ? (
						<div class="hero-background-layout__header">
							{title ? <h1 class="hero-background-layout__title">{title}</h1> : null}
							{description ? <p class="hero-background-layout__description">{description}</p> : null}
							{typeof step?.index === 'number' && typeof step?.total === 'number' ? (
								<p class="hero-background-layout__step-counter">
									Step {step.index + 1} of {step.total}
								</p>
							) : null}
						</div>
					) : null}
					<div class="hero-background-layout__form">
						<slot />
					</div>
				</div>
			</div>
		);
	}
}

export function HeroBackgroundLayout({ children, className }: { children?: JsxRenderable; className?: string }) {
	return jsx('se-hero-background-layout', {
		'prop:layoutClass': className ?? '',
		children,
	});
}
