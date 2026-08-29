import './split-screen-layout.css';
import '@ecopages/radiant-ui/heading/styles.css';
import '@ecopages/radiant-ui/headline/styles.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, query, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
import { RuiHeading, RuiHeadingDescription, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { layoutContext } from '@/contexts/layout-context';
import type { SplitScreenLayoutConfig } from './split-screen-layout.types';

function layoutClassName(...parts: Array<string | false | undefined>) {
	return parts.filter(Boolean).join(' ');
}

@customElement('se-split-screen-layout')
export class SplitScreenLayoutElement extends RadiantElement {
	@prop({ type: String }) layoutClass = '';

	@contextSelector({ context: layoutContext })
	layoutContext!: {
		step: { title?: string; description?: string; index?: number; total?: number };
		form: { title?: string; description?: string };
		config: SplitScreenLayoutConfig;
	};

	@query({ ref: 'side-content' })
	sideContentTarget!: HTMLElement;

	protected override onConnected(): void {
		this.syncSideContent();
	}

	private sideContent(): string {
		const content = this.layoutContext?.config?.sideContent;
		return typeof content === 'string' ? content : '';
	}

	private syncSideContent(): void {
		const target = this.sideContentTarget;
		const content = this.sideContent();
		if (!target || !content) {
			return;
		}

		if (/<[a-z][\s\S]*>/i.test(content)) {
			if (target.innerHTML !== content) {
				target.innerHTML = content;
			}
			return;
		}

		if (target.textContent !== content) {
			target.textContent = content;
		}
	}

	override render(): JsxRenderable {
		const { step, form, config } = this.layoutContext ?? {
			step: {},
			form: {},
			config: {},
		};
		const sidePlacement = config.sidePlacement ?? 'left';
		const sideWidth = config.sideWidth ?? 'normal';
		const contentAlignment = config.contentAlignment ?? 'center';
		const sideContent = this.sideContent();
		const title = form?.title || step?.title;

		const view = (
			<div class={layoutClassName('split-screen-layout', this.layoutClass || undefined)}>
				{title || sideContent ? (
					<div
						class={layoutClassName(
							'split-screen-layout__side',
							`split-screen-layout__side--${sideWidth}`,
							sidePlacement === 'right' ? 'split-screen-layout__side--right' : undefined,
						)}
					>
						<RuiHeading size="md" as="header">
							{title ? <RuiHeadingTitle as="h2">{title}</RuiHeadingTitle> : null}
							{sideContent ? (
								<RuiHeadingDescription
									data-ref="side-content"
									class="split-screen-layout__side-content"
								>
									{sideContent}
								</RuiHeadingDescription>
							) : null}
						</RuiHeading>
					</div>
				) : null}
				<div
					class={layoutClassName(
						'split-screen-layout__main',
						`split-screen-layout__main--${contentAlignment}`,
					)}
				>
					<slot />
				</div>
			</div>
		);

		if (/<[a-z][\s\S]*>/i.test(sideContent)) {
			queueMicrotask(() => this.syncSideContent());
		}

		return view;
	}
}

export function SplitScreenLayout({ children, className }: { children?: JsxRenderable; className?: string }) {
	return jsx('se-split-screen-layout', {
		'prop:layoutClass': className ?? '',
		children,
	});
}
