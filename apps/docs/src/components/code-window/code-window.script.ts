type AnchorWithTarget = HTMLAnchorElement & { dataset: DOMStringMap };

/**
 * Tiny client-side controller for the home page code window.
 *
 * The server renders the first tab visible. This script listens for
 * clicks on `[data-code-tab]` anchors and toggles `[data-code-tab-panel]`
 * blocks inside the matching `[data-code-tab-target]` body. No island,
 * no React, no full route hydration.
 */
function init(): void {
	document.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLAnchorElement)) return;
		const anchor = target as AnchorWithTarget;
		const tabId = anchor.dataset['codeTab'];
		const targetId = anchor.dataset['codeTabTarget'];
		if (!tabId || !targetId) return;

		event.preventDefault();
		const tablist = anchor.closest('[role="tablist"]');
		if (!tablist) return;

		for (const tab of tablist.querySelectorAll<HTMLAnchorElement>('[data-code-tab]')) {
			const isActive = tab === anchor;
			tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
			tab.className = isActive
				? 'px-4 py-2 text-xs font-mono font-semibold text-on-background border-b-2 border-primary -mb-px'
				: 'px-4 py-2 text-xs font-mono text-on-background/60 hover:text-on-background';
		}

		const body = document.getElementById(targetId);
		if (!body) return;
		for (const panel of body.querySelectorAll<HTMLElement>('[data-code-tab-panel]')) {
			panel.hidden = panel.dataset['codeTabPanel'] !== tabId;
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
	init();
}
