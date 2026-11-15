/** @jsxImportSource @ecopages/jsx */
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RadiantElement, customElement, onEvent, prop, state } from '@ecopages/radiant';
import { COPY_ICON_ATTRIBUTES, COPY_ICON_SHAPES } from '../../lib/copy-icons';
import { renderTabLabel } from './code-tab-icons';

/**
 * Plain-text tabs escape `code`. Rich tabs pass highlighted HTML in `html` and
 * clipboard text in `content` — strings survive host-attribute JSON round-trips;
 * JSX/`unsafeHtml` brands do not.
 */
export type RadiantCodeTabItem =
	| {
			id: string;
			label: string;
			code: string;
	  }
	| {
			id: string;
			label: string;
			html: string;
			content: string;
	  };

export type RadiantCodeTabsProps = {
	name: string;
	label?: string;
	tabs?: RadiantCodeTabItem[];
	copyLabel?: string;
	defaultSelectedKey?: string;
	selectedKey?: string;
};

function isRichTab(tab: RadiantCodeTabItem): tab is Extract<RadiantCodeTabItem, { html: string; content: string }> {
	return 'html' in tab;
}

function tabClipboardText(tab: RadiantCodeTabItem): string {
	return isRichTab(tab) ? tab.content : tab.code;
}

const COPY_STATUS_TIMEOUT_MS = 2000;

function CopyIcons() {
	return (
		<>
			{(Object.keys(COPY_ICON_SHAPES) as (keyof typeof COPY_ICON_SHAPES)[]).map((kind) => (
				<svg {...COPY_ICON_ATTRIBUTES} data-copy-icon={kind}>
					{COPY_ICON_SHAPES[kind].map((shape) =>
						shape.tag === 'rect' ? <rect {...shape.attributes} /> : <path {...shape.attributes} />,
					)}
				</svg>
			))}
		</>
	);
}

/**
 * Docs-specific code presentation that delegates tab selection and keyboard
 * interaction to `RuiTabs` while retaining code-copying behavior.
 *
 * @remarks
 * `RuiTab` and `RuiTabPanel` stamp their key as a literal DOM id, so `name`
 * prefixes every key to keep ids unique when several instances share a page.
 * `name` must be unique per page and id-safe.
 */
@customElement('radiant-code-tabs')
export class RadiantCodeTabs extends RadiantElement {
	@prop({ type: String }) name = '';
	@prop({ type: Array }) tabs: RadiantCodeTabItem[] = [];
	@prop({ type: String }) label = '';
	@prop({ type: String }) copyLabel = 'Copy code';
	@prop({ type: String }) defaultSelectedKey = '';
	@prop({ type: String, reflect: true }) selectedKey = '';
	@state copyStatus = '';
	@state copyState: '' | 'copied' | 'error' = '';
	@state copyTab = '';

	private copyStatusTimer: ReturnType<typeof setTimeout> | undefined;

	private tabKey(tab: RadiantCodeTabItem): string {
		return `${this.name}-${tab.id}`;
	}

	/**
	 * Shows the result on the tab's copy button and in the live region until the timeout clears both.
	 *
	 * @remarks
	 * A repeated result for the same tab clears the state, waits for that render and forces a reflow before setting
	 * it again, so the one-shot animation in `copy-button.css` runs again.
	 */
	private async announce(message: string, tab: string, result: 'copied' | 'error'): Promise<void> {
		clearTimeout(this.copyStatusTimer);
		if (this.copyState === result && this.copyTab === tab) {
			this.copyState = '';
			await this.updateComplete;
			void this.offsetWidth;
		}
		this.copyStatus = message;
		this.copyTab = tab;
		this.copyState = result;
		this.copyStatusTimer = setTimeout(() => {
			this.copyStatus = '';
			this.copyState = '';
			this.copyTab = '';
		}, COPY_STATUS_TIMEOUT_MS);
	}

	private handleCopy = async (tab: RadiantCodeTabItem): Promise<void> => {
		try {
			await navigator.clipboard.writeText(tabClipboardText(tab));
			await this.announce(`${tab.label} copied to clipboard`, tab.id, 'copied');
		} catch {
			await this.announce(`Failed to copy ${tab.label}`, tab.id, 'error');
		}
	};

	override disconnectedCallback(): void {
		clearTimeout(this.copyStatusTimer);
		super.disconnectedCallback();
	}

	@onEvent({ selector: 'rui-tabs', type: 'rui-change' })
	onTabChange(event: Event): void {
		const value = (event as CustomEvent<{ value?: string }>).detail?.value;
		const tab = this.tabs.find((candidate) => this.tabKey(candidate) === value);
		if (tab) {
			this.selectedKey = tab.id;
		}
	}

	override render() {
		const tabs = this.tabs;
		if (tabs.length === 0) {
			return null;
		}
		if (!this.name) {
			throw new Error('<radiant-code-tabs> requires a non-empty `name` to keep tab and panel ids unique.');
		}

		const requestedSelectedKey = this.selectedKey || this.defaultSelectedKey;
		const selectedTab = tabs.find((tab) => tab.id === requestedSelectedKey) ?? tabs[0]!;
		const selectedKey = selectedTab.id;
		const tabListLabel = this.label || 'Code examples';

		return (
			<RuiTabs variant="boxed" value={this.tabKey(selectedTab)} label={tabListLabel}>
				<RuiTabList aria-label={tabListLabel} class="code-tabs__list">
					{tabs.map((tab) => (
						<RuiTab id={this.tabKey(tab)} class="code-tabs__tab" selected={tab.id === selectedKey}>
							{renderTabLabel({
								id: tab.id,
								label: tab.label,
								code: tabClipboardText(tab),
							})}
						</RuiTab>
					))}
				</RuiTabList>
				<RuiTabPanels>
					{tabs.map((tab) => (
						<RuiTabPanel id={this.tabKey(tab)} class="code-tabs__panel" selected={tab.id === selectedKey}>
							<div class="code-tabs__body unstyled">
								{isRichTab(tab) ? (
									<div class="code-tabs__code">{unsafeHtml(tab.html)}</div>
								) : (
									<pre class="code-tabs__code">
										<code>{tab.code}</code>
									</pre>
								)}
								<RuiButton
									size="sm"
									variant="ghost"
									class="code-tabs__copy"
									aria-label={`${this.copyLabel}: ${tab.label}`}
									data-copy-button=""
									data-copy-state={tab.id === this.copyTab ? this.copyState || undefined : undefined}
									on:click={() => void this.handleCopy(tab)}
								>
									<CopyIcons />
								</RuiButton>
							</div>
						</RuiTabPanel>
					))}
				</RuiTabPanels>
				<span class="code-tabs__status" aria-live="polite">
					{this.copyStatus}
				</span>
			</RuiTabs>
		);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-code-tabs': JsxCustomElementAttributes<RadiantCodeTabs, RadiantCodeTabsProps>;
	}
}
