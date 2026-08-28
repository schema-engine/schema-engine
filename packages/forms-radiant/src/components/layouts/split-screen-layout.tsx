import './split-screen-layout.css';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import { jsx, type JsxRenderable } from '@ecopages/jsx/jsx-runtime';
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

	protected override onConnected(): void {
		this.syncSideContent();
	}

	private sideContent(): string {
		const content = this.layoutContext?.config?.sideContent;
		return typeof content === 'string' ? content : '';
	}

	private syncSideContent(): void {
		const target = this.querySelector<HTMLElement>('.split-screen-layout__side-content');
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
		const { config } = this.layoutContext ?? {
			config: {},
		};
		const sidePlacement = config.sidePlacement ?? 'left';
		const sideWidth = config.sideWidth ?? 'normal';
		const contentAlignment = config.contentAlignment ?? 'center';
		const sideContent = this.sideContent();

		return (
			<div class={layoutClassName('split-screen-layout', this.layoutClass || undefined)}>
				{sideContent ? (
					<div
						class={layoutClassName(
							'split-screen-layout__side',
							`split-screen-layout__side--${sideWidth}`,
							sidePlacement === 'right' ? 'split-screen-layout__side--right' : undefined,
						)}
					>
						<div class="split-screen-layout__side-content">{sideContent}</div>
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
	}
}

export function SplitScreenLayout({ children, className }: { children?: JsxRenderable; className?: string }) {
	return jsx('se-split-screen-layout', {
		'prop:layoutClass': className ?? '',
		children,
	});
}
