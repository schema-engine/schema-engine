import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionPlaygroundElement } from './action-playground.script';

function resetDom(): void {
	document.body.innerHTML = '';
}

async function mountPlayground(example = 'sequential'): Promise<ActionPlaygroundElement> {
	const element = document.createElement('se-action-playground') as ActionPlaygroundElement;
	element.example = example as ActionPlaygroundElement['example'];
	element.delayMs = 15;
	document.body.appendChild(element);
	await vi.waitFor(() => {
		expect(element.querySelector('[data-node-id="result"]')).not.toBeNull();
		expect(element.getAttribute('data-ready')).toBe('');
	});
	return element;
}

describe('ActionPlaygroundElement', () => {
	beforeEach(() => {
		resetDom();
	});

	afterEach(() => {
		resetDom();
	});

	it('dispatches the sequential example through the real dispatcher', async () => {
		const element = await mountPlayground();
		const control = element.querySelector<HTMLButtonElement>('.action-playground__control');
		expect(control).not.toBeNull();
		control!.click();
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="index"]')?.getAttribute('data-status')).toBe('succeeded');
		});
		expect(element.querySelector('[data-node-id="result"]')?.getAttribute('data-status')).toBe('succeeded');
		expect(element.querySelector('[data-node-id="result"]')?.textContent).toContain('payload · row:42 · indexed');
	});

	it('starts a parallel group together', async () => {
		const element = await mountPlayground('parallel');
		const control = element.querySelector<HTMLButtonElement>('.action-playground__control');
		expect(control).not.toBeNull();
		control!.click();
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="result"]')?.getAttribute('data-status')).toBe('succeeded');
		});
		expect(element.querySelector('[data-node-id="analytics"]')?.getAttribute('data-status')).toBe('succeeded');
		expect(element.querySelector('[data-node-id="webhook"]')?.getAttribute('data-status')).toBe('succeeded');
		expect(element.querySelector('[data-node-id="cache"]')?.getAttribute('data-status')).toBe('succeeded');
	});
});
