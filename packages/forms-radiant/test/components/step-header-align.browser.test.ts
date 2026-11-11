import { afterEach, expect, test } from 'vitest';
import * as z from 'zod/mini';
import { StepHeaderConfigSchema } from '@schema-engine/forms/recipes/built-in';
import '@/components/blocks/wizard-blocks.css';
import { StepHeaderElement } from '@/components/blocks/step-header';

afterEach(() => document.body.replaceChildren());

async function mountHeader(slotConfig: Record<string, unknown>) {
	const element = new StepHeaderElement();
	element.meta = { id: 'align', steps: [{ id: 'one', title: 'One' }] };
	element.slotConfig = z.parse(StepHeaderConfigSchema, slotConfig);
	document.body.append(element);
	await expect.poll(() => element.querySelector('.se-step-header')).toBeTruthy();
	return element.querySelector<HTMLElement>('.se-step-header')!;
}

test('data-align drives the header alignment', async () => {
	const centered = await mountHeader({ align: 'center' });

	expect(centered.dataset.align).toBe('center');
	expect(getComputedStyle(centered).textAlign).toBe('center');

	centered.removeAttribute('data-align');

	expect(getComputedStyle(centered).textAlign).not.toBe('center');
});

test('a start header is left aligned', async () => {
	expect(getComputedStyle(await mountHeader({ align: 'start' })).textAlign).toBe('left');
});
