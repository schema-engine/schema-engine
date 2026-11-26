import { createElement } from 'react';
import { createRoot as createReactRoot, type Root } from 'react-dom/client';
import { createRoot as createRadiantRoot } from '@ecopages/jsx/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Survey as ReactSurvey } from './branching-survey.react';
import { Survey as RadiantSurvey } from './branching-survey.radiant';

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

/** A field of a step that is not current is absent in React and hidden in Radiant. */
const shown = (host: HTMLElement, selector: string) => {
	const element = host.querySelector(selector);
	return element !== null && element.closest('[hidden]') === null;
};

/** The labels of the options, which the shadcn select shows. */
const labels: Record<string, string> = {
	great: 'Great',
	fine: 'Fine',
	poor: 'Poor',
	slow: 'It took too long',
	unresolved: 'It was not solved',
};

/** An option of the open listbox, which the select renders in a portal outside the form. */
const option = (label: string) =>
	[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
		(candidate) => candidate.textContent === label,
	)!;

interface Driver {
	mount(onSent: () => void): Promise<HTMLElement>;
	/** The submit button of the last step: React's own text, and the built-in recipe's text in Radiant. */
	finish: string;
	choose(host: HTMLElement, name: string, value: string): Promise<void>;
	/** Whether a select is on screen: the trigger of the shadcn select in React, the field of the Radiant select in Radiant. */
	hasSelect(host: HTMLElement, name: string): boolean;
}

const react: Driver = {
	finish: 'Send answers',
	async mount(onSent) {
		const host = document.createElement('div');
		document.body.append(host);
		root = createReactRoot(host);
		root.render(createElement(ReactSurvey, { onSent }));
		await expect.poll(() => host.querySelector('form')).toBeTruthy();
		return host;
	},
	async choose(host, name, value) {
		await userEvent.click(host.querySelector<HTMLElement>(`[data-slot="select-trigger"][name="${name}"]`)!);
		await userEvent.click(option(labels[value]!));
	},
	hasSelect: (host, name) => shown(host, `[data-slot="select-trigger"][name="${name}"]`),
};

const radiant: Driver = {
	finish: 'Submit',
	async mount(onSent) {
		const host = document.createElement('div');
		document.body.append(host);
		createRadiantRoot(host).render(RadiantSurvey({ onSent }));
		await expect.poll(() => host.querySelector('input[name="name"]')).toBeTruthy();
		return host;
	},
	async choose(host, name, value) {
		const field = host.querySelector<HTMLElement>(`se-field[name="${name}"]`)!;
		await userEvent.click(field.querySelector<HTMLElement>('[data-select-trigger]')!);
		await userEvent.click(field.querySelector<HTMLElement>(`[data-value="${value}"]`)!);
	},
	hasSelect: (host, name) => shown(host, `se-field[name="${name}"]`),
};

const button = (host: HTMLElement, name: string) =>
	[...host.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === name)!;

async function answerFirstStep(host: HTMLElement, driver: Driver, satisfaction: string) {
	await userEvent.type(host.querySelector('input[name="name"]')!, 'Ada Lovelace');
	await driver.choose(host, 'satisfaction', satisfaction);
	await userEvent.click(button(host, 'Next'));
}

describe.each([
	['React', react],
	['Radiant', radiant],
])('the %s survey', (_renderer, driver) => {
	test('a good experience skips the follow-up step and leaves its fields out of the answers', async () => {
		const send = vi.fn(async () => new Response(null, { status: 201 }));
		vi.stubGlobal('fetch', send);
		const onSent = vi.fn();
		const host = await driver.mount(onSent);

		await answerFirstStep(host, driver, 'great');
		await expect.poll(() => shown(host, 'textarea[name="comments"]')).toBe(true);
		expect(driver.hasSelect(host, 'reason')).toBe(false);

		await userEvent.type(host.querySelector('textarea[name="comments"]')!, 'Quick and friendly.');
		await userEvent.click(button(host, driver.finish));

		await expect.poll(() => onSent.mock.calls.length).toBe(1);
		const [, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({
			name: 'Ada Lovelace',
			satisfaction: 'great',
			comments: 'Quick and friendly.',
		});
	});

	test('a poor experience opens the follow-up step, which validates before Next', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 201 })),
		);
		const host = await driver.mount(vi.fn());

		await answerFirstStep(host, driver, 'poor');
		await expect.poll(() => driver.hasSelect(host, 'reason')).toBe(true);

		await userEvent.click(button(host, 'Next'));
		await expect.poll(() => host.textContent).toContain('Choose the main problem');
		expect(shown(host, 'textarea[name="comments"]')).toBe(false);

		await driver.choose(host, 'reason', 'slow');
		await userEvent.type(host.querySelector('textarea[name="details"]')!, 'short');
		await userEvent.click(button(host, 'Next'));
		await expect.poll(() => host.textContent).toContain('Use at least 20 characters');

		await userEvent.type(host.querySelector('textarea[name="details"]')!, ' but it was waiting for days');
		await userEvent.click(button(host, 'Next'));
		await expect.poll(() => shown(host, 'textarea[name="comments"]')).toBe(true);
	});

	test('changing the answer back to a good one drops what was typed in the skipped step', async () => {
		const send = vi.fn(async () => new Response(null, { status: 201 }));
		vi.stubGlobal('fetch', send);
		const onSent = vi.fn();
		const host = await driver.mount(onSent);

		await answerFirstStep(host, driver, 'poor');
		await expect.poll(() => driver.hasSelect(host, 'reason')).toBe(true);
		await driver.choose(host, 'reason', 'unresolved');
		await userEvent.type(host.querySelector('textarea[name="details"]')!, 'It was never solved at all.');
		await userEvent.click(button(host, 'Previous'));
		await expect.poll(() => shown(host, 'input[name="name"]')).toBe(true);

		await driver.choose(host, 'satisfaction', 'fine');
		await userEvent.click(button(host, 'Next'));
		await expect.poll(() => shown(host, 'textarea[name="comments"]')).toBe(true);
		await userEvent.click(button(host, driver.finish));

		await expect.poll(() => onSent.mock.calls.length).toBe(1);
		const [, init] = send.mock.calls[0] as unknown as [string, RequestInit];
		const body = JSON.parse(init.body as string);
		expect(body).toMatchObject({ name: 'Ada Lovelace', satisfaction: 'fine' });
		expect(body).not.toHaveProperty('reason');
		expect(body).not.toHaveProperty('details');
	});

	test('a failed send does not call onSent', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 500 })),
		);
		const onSent = vi.fn();
		const host = await driver.mount(onSent);

		await answerFirstStep(host, driver, 'fine');
		await expect.poll(() => shown(host, 'textarea[name="comments"]')).toBe(true);
		await userEvent.click(button(host, driver.finish));

		await expect.poll(() => button(host, driver.finish)?.disabled === false).toBe(true);
		expect(onSent).not.toHaveBeenCalled();
	});
});
