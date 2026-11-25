import { createElement } from 'react';
import { createRoot as createReactRoot, type Root } from 'react-dom/client';
import { createRoot as createRadiantRoot } from '@ecopages/jsx/client';
import { afterEach, describe, expect, test } from 'vitest';
import { ThemedForm as RadiantThemedForm } from './theming.radiant';
import { ThemedForm as ReactThemedForm } from './theming.react';
import './themed.css';

let root: Root | undefined;

afterEach(() => {
	root?.unmount();
	root = undefined;
	document.body.replaceChildren();
});

const react = async (): Promise<HTMLElement> => {
	const host = document.createElement('div');
	document.body.append(host);
	root = createReactRoot(host);
	root.render(createElement(ReactThemedForm));
	await expect.poll(() => host.querySelector('form')).toBeTruthy();
	return host;
};

const radiant = async (): Promise<HTMLElement> => {
	const host = document.createElement('div');
	document.body.append(host);
	createRadiantRoot(host).render(RadiantThemedForm());
	await expect.poll(() => host.querySelector('input[name="first"]')).toBeTruthy();
	return host;
};

describe.each([
	['React', react],
	['Radiant', radiant],
])('the %s themed form', (_renderer, mount) => {
	test('puts the half-width fields on one row and carries the picks of its three axes', async () => {
		const host = await mount();

		const first = host.querySelector('input[name="first"]')!.getBoundingClientRect();
		const last = host.querySelector('input[name="last"]')!.getBoundingClientRect();
		const email = host.querySelector('input[name="email"]')!.getBoundingClientRect();
		expect(first.top).toBe(last.top);
		expect(last.left).toBeGreaterThan(first.right);
		expect(email.top).toBeGreaterThan(first.top);

		expect(host.querySelector('[data-se-size="compact"]')).not.toBeNull();
		expect(host.querySelector('[data-se-surface="outlined"]')).not.toBeNull();
		expect(host.querySelector('[data-se-tone="brand"]')).not.toBeNull();
	});
});
