import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { installMockFormApi } from '@/lib/mock-form-api';
import { mountFormRenderer } from './mount-form-renderer';
import { getPreviewConfig, type PreviewId } from './preview-configs';

export type DocsFormRendererProps = {
	'data-preview'?: PreviewId;
};

@customElement('docs-form-renderer')
export class DocsFormRenderer extends RadiantElement {
	private root: { unmount: () => void } | undefined;

	protected override shouldRunRenderLifecycle(): boolean {
		return false;
	}

	protected override onConnected(): void {
		installMockFormApi();
		this.mount();
	}

	override disconnectedCallback(): void {
		this.unmount();
		super.disconnectedCallback();
	}

	private mount(): void {
		this.unmount();

		const preview = this.getAttribute('data-preview') ?? '';
		const config = getPreviewConfig(preview);
		const target = this.querySelector('[data-mount]');
		if (!config || !(target instanceof HTMLElement)) {
			console.warn(`[docs-form-renderer] no config for preview "${preview}"`);
			return;
		}

		this.root = mountFormRenderer(target, config);
	}

	private unmount(): void {
		this.root?.unmount();
		this.root = undefined;
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'docs-form-renderer': JsxCustomElementAttributes<DocsFormRenderer, DocsFormRendererProps>;
	}
}
