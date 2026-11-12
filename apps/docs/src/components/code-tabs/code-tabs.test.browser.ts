import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { RadiantCodeTabs } from './code-tabs.script';

function resetDom(): void {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
	vi.useRealTimers();
}

function createCodeTabs(name = 'install'): RadiantCodeTabs {
	const element = document.createElement('radiant-code-tabs') as RadiantCodeTabs;
	element.name = name;
	element.label = 'Code examples';
	element.copyLabel = 'Copy code';
	element.tabs = [
		{ id: 'js', label: 'JavaScript', code: 'console.log("js")' },
		{ id: 'ts', label: 'TypeScript', code: 'console.log("ts")' },
		{ id: 'bash', label: 'Bash', code: 'echo bash' },
	];
	return element;
}

function mockClipboard(writeText: (text: string) => Promise<void>): void {
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: { writeText },
	});
}

async function mount(codeTabs: RadiantCodeTabs): Promise<HTMLButtonElement> {
	document.body.appendChild(codeTabs);
	let copyButton: HTMLButtonElement | null = null;
	await vi.waitFor(() => {
		copyButton = codeTabs.querySelector<HTMLButtonElement>('.code-tabs__copy');
		expect(copyButton).not.toBeNull();
	});
	return copyButton!;
}

function status(codeTabs: RadiantCodeTabs): string {
	return codeTabs.querySelector('.code-tabs__status')?.textContent?.trim() ?? '';
}

describe('RadiantCodeTabs', () => {
	beforeEach(() => {
		resetDom();
	});

	afterEach(() => {
		resetDom();
	});

	it('selects the next tab on ArrowRight and reflects it on the host', async () => {
		const codeTabs = createCodeTabs();
		codeTabs.defaultSelectedKey = 'ts';
		document.body.appendChild(codeTabs);

		await vi.waitFor(() => {
			expect(codeTabs.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('TypeScript');
		});
		const changeSpy = vi.fn();
		codeTabs.querySelector('rui-tabs')?.addEventListener('rui-change', changeSpy);

		const selectedTab = codeTabs.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')!;
		selectedTab.focus();
		selectedTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));

		await vi.waitFor(() => {
			expect(codeTabs.selectedKey).toBe('bash');
			expect(codeTabs.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Bash');
		});
		expect(changeSpy).toHaveBeenCalledTimes(1);
		expect(codeTabs.getAttribute('selected-key')).toBe('bash');
	});

	it('announces a copy and clears the status after two seconds', async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const writeText = vi.fn().mockResolvedValue(undefined);
		mockClipboard(writeText);
		const codeTabs = createCodeTabs();
		codeTabs.selectedKey = 'js';
		const copyButton = await mount(codeTabs);

		await user.click(copyButton);

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('console.log("js")');
			expect(status(codeTabs)).toBe('JavaScript copied to clipboard');
		});

		vi.advanceTimersByTime(2000);

		await vi.waitFor(() => {
			expect(status(codeTabs)).toBe('');
		});
	});

	it('announces a failed copy', async () => {
		const user = userEvent.setup();
		mockClipboard(vi.fn().mockRejectedValue(new Error('denied')));
		const codeTabs = createCodeTabs();
		codeTabs.selectedKey = 'js';
		const copyButton = await mount(codeTabs);

		await user.click(copyButton);

		await vi.waitFor(() => {
			expect(status(codeTabs)).toBe('Failed to copy JavaScript');
		});
	});

	it('keeps every id unique and every tab wired to its own panel across instances', async () => {
		const install = createCodeTabs('install');
		const usage = createCodeTabs('usage');
		document.body.append(install, usage);

		await vi.waitFor(() => {
			expect(document.querySelectorAll('[role="tab"]')).toHaveLength(6);
		});

		const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
		expect(new Set(ids).size).toBe(ids.length);

		for (const codeTabs of [install, usage]) {
			const tab = codeTabs.querySelector<HTMLElement>('[role="tab"]')!;
			const panel = codeTabs.querySelector<HTMLElement>(`[id="${tab.getAttribute('aria-controls')}"]`);
			expect(panel).not.toBeNull();
			expect(panel?.getAttribute('aria-labelledby')).toBe(tab.id);
		}
	});

	it('renders nothing after the caller clears tabs', async () => {
		const codeTabs = createCodeTabs();
		document.body.appendChild(codeTabs);

		await vi.waitFor(() => {
			expect(codeTabs.querySelector('[role="tab"]')?.textContent).toBe('JavaScript');
		});

		codeTabs.tabs = [];

		await vi.waitFor(() => {
			expect(codeTabs.querySelector('[role="tab"]')).toBeNull();
		});

		expect(codeTabs.querySelector('.code-tabs__code')).toBeNull();
	});
});
