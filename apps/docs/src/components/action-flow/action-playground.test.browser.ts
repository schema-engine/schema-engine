import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionPlaygroundElement } from './action-playground.script';

function resetDom(): void {
	document.body.innerHTML = '';
}

async function mountPlayground(example = 'sequential', delayMs = 15): Promise<ActionPlaygroundElement> {
	const element = document.createElement('se-action-playground') as ActionPlaygroundElement;
	element.example = example as ActionPlaygroundElement['example'];
	element.delayMs = delayMs;
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

	it('labels every node as an interrupt while running and as a reset once done', async () => {
		const element = await mountPlayground('sequential', 60);
		const control = element.querySelector<HTMLButtonElement>('.action-playground__control')!;
		control.click();
		await vi.waitFor(() => {
			expect(control.getAttribute('aria-label')).toMatch(/^Interrupt /);
		});
		expect(element.querySelector('[data-node-id="index"]')?.getAttribute('aria-label')).toBe('Interrupt index');
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="result"]')?.getAttribute('data-status')).toBe('succeeded');
		});
		expect(element.querySelector('[data-node-id="index"]')?.getAttribute('aria-label')).toBe('Reset index');
	});

	it('interrupts a running dispatch and resets from the same control', async () => {
		const element = await mountPlayground('sequential', 400);
		const control = element.querySelector<HTMLButtonElement>('.action-playground__control')!;
		control.click();
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="serialize"]')?.getAttribute('data-status')).toBe('running');
		});
		control.click();
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="result"]')?.getAttribute('data-status')).toBe('cancelled');
		});
		control.click();
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="result"]')?.getAttribute('data-status')).toBe('idle');
		});
	});

	it('rebuilds its session when the example changes and after a reconnect', async () => {
		const element = await mountPlayground();
		element.example = 'parallel';
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="analytics"]')).not.toBeNull();
		});
		const parent = element.parentElement!;
		element.remove();
		parent.appendChild(element);
		await element.updateComplete;
		element.querySelector<HTMLButtonElement>('.action-playground__control')!.click();
		await vi.waitFor(() => {
			expect(element.querySelector('[data-node-id="result"]')?.getAttribute('data-status')).toBe('succeeded');
		});
	});
});
