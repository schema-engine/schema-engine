import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RadiantElement, customElement, onEvent, prop, state } from '@ecopages/radiant';
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

	private copyStatusTimer: ReturnType<typeof setTimeout> | undefined;

	private tabKey(tab: RadiantCodeTabItem): string {
		return `${this.name}-${tab.id}`;
	}

	private announce(message: string): void {
		clearTimeout(this.copyStatusTimer);
		this.copyStatus = message;
		this.copyStatusTimer = setTimeout(() => {
			this.copyStatus = '';
		}, COPY_STATUS_TIMEOUT_MS);
	}

	private handleCopy = async (tab: RadiantCodeTabItem): Promise<void> => {
		try {
			await navigator.clipboard.writeText(tabClipboardText(tab));
			this.announce(`${tab.label} copied to clipboard`);
		} catch {
			this.announce(`Failed to copy ${tab.label}`);
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

		const requestedSelectedKey = this.selectedKey || this.defaultSelectedKey;
		const selectedKey = tabs.some((tab) => tab.id === requestedSelectedKey) ? requestedSelectedKey : tabs[0]?.id;
		const tabListLabel = this.label || 'Code examples';

		return (
			<RuiTabs variant="boxed" value={`${this.name}-${selectedKey}`} label={tabListLabel}>
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
									on:click={() => void this.handleCopy(tab)}
								>
									<span aria-hidden="true">Copy</span>
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
