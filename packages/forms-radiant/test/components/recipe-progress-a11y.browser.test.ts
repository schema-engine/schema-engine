import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import * as z from 'zod/mini';
import { createInitialStepStates } from '@schema-engine/forms/engine';
import { MinimalProgressConfigSchema, StepIndicatorsConfigSchema } from '@schema-engine/forms/recipes/built-in';
import '@/components/blocks/wizard-blocks.css';
import { MinimalProgressElement } from '@/components/blocks/minimal-progress';
import { StepIndicatorsElement } from '@/components/blocks/step-indicators';
import { deriveInitialInstance, type FormMeta } from '@/lib/instance-view';

afterEach(() => document.body.replaceChildren());

function createMeta(titles: string[]): FormMeta {
	return { id: 'a11y', steps: titles.map((title, index) => ({ id: `step-${index}`, title })) };
}

function createInstance(meta: FormMeta, currentStep: number, completed: boolean[]) {
	const initial = deriveInitialInstance(meta);
	return {
		...initial,
		currentStep,
		stepStates: { ...createInitialStepStates(meta.steps.length), completed, visited: meta.steps.map(() => true) },
	};
}

async function mountIndicators(meta: FormMeta, slotConfig: Record<string, unknown> = {}) {
	const element = new StepIndicatorsElement();
	element.meta = meta;
	element.slotConfig = z.parse(StepIndicatorsConfigSchema, slotConfig);
	element.instance = createInstance(meta, 1, [true, false, false]);
	document.body.append(element);
	await expect.poll(() => element.querySelector('.se-step-indicators')).toBeTruthy();
	return element;
}

async function mountProgress(meta: FormMeta, slotConfig: Record<string, unknown> = {}) {
	const element = new MinimalProgressElement();
	element.meta = meta;
	element.slotConfig = z.parse(MinimalProgressConfigSchema, slotConfig);
	element.instance = createInstance(meta, 1, [true, false, false]);
	document.body.append(element);
	await expect.poll(() => element.querySelector('.se-minimal-progress')).toBeTruthy();
	return element;
}

test('step indicators expose the current and completed steps', async () => {
	await mountIndicators(createMeta(['One', 'Two', 'Three']));

	await expect.element(page.getByRole('button', { name: /Two/ })).toHaveAttribute('aria-current', 'step');
	await expect.element(page.getByRole('button', { name: /One/ })).toHaveAccessibleName(/completed/);
	await expect.element(page.getByRole('button', { name: /Three/ })).not.toHaveAttribute('aria-current');
	await expect.element(page.getByRole('button', { name: /Three/ })).not.toHaveAccessibleName(/completed/);
});

test('the completed check glyph is hidden from assistive technology', async () => {
	const element = await mountIndicators(createMeta(['One', 'Two', 'Three']));
	const glyph = element.querySelector('.se-step-indicators__number [aria-hidden="true"]');

	expect(glyph?.textContent).toBe('✓');
});

test('a completed step keeps its number in the name when titles are hidden', async () => {
	await mountIndicators(createMeta(['One', 'Two', 'Three']), { showStepTitles: false });

	await expect.element(page.getByRole('button', { name: 'Step 1, completed' })).toBeInTheDocument();
});

test('the completed status is localizable', async () => {
	await mountIndicators(createMeta(['One', 'Two', 'Three']), {
		labels: { completed: 'Schritt {current} abgeschlossen' },
	});

	await expect.element(page.getByRole('button', { name: /One/ })).toHaveAccessibleName(/Schritt 1 abgeschlossen/);
});

test('an untitled step falls back to a localizable title', async () => {
	await mountIndicators(createMeta(['', '', '']), { labels: { untitledStep: 'Schritt {current}' } });

	await expect.element(page.getByRole('button', { name: /Schritt 2/ })).toBeInTheDocument();
});

test('minimal progress is a labelled progressbar and not a navigation landmark', async () => {
	await mountProgress(createMeta(['One', 'Two', 'Three']));
	const bar = page.getByRole('progressbar', { name: 'Progress' });

	await expect.element(bar).toHaveAttribute('aria-valuemin', '0');
	await expect.element(bar).toHaveAttribute('aria-valuemax', '100');
	await expect.element(bar).toHaveAttribute('aria-valuenow', '67');
	await expect.element(bar).toHaveAttribute('aria-valuetext', 'Step 2 of 3');
	expect(document.querySelector('nav')).toBeNull();
});

test('the progress bar is named by the localizable visible label', async () => {
	await mountProgress(createMeta(['One', 'Two', 'Three']), {
		showPercentage: false,
		labels: { progress: 'Fortschritt' },
	});

	await expect.element(page.getByRole('progressbar', { name: 'Fortschritt' })).toBeInTheDocument();
});

test('the progress value text is localizable', async () => {
	await mountProgress(createMeta(['One', 'Two', 'Three']), {
		labels: { valueText: 'Schritt {current} von {total}' },
	});

	await expect.element(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Schritt 2 von 3');
});

test('the visible percentage is hidden from assistive technology', async () => {
	const element = await mountProgress(createMeta(['One', 'Two', 'Three']));
	const percentage = [...element.querySelectorAll('span')].find((span) => span.textContent === '67%');

	expect(percentage?.getAttribute('aria-hidden')).toBe('true');
});

test('only the percentage is styled as a muted figure, not the progress label', async () => {
	const without = await mountProgress(createMeta(['One', 'Two', 'Three']), { showPercentage: false });
	const label = without.querySelector('.se-minimal-progress__labels span')!;

	expect(label.textContent).toBe('Progress');
	expect(getComputedStyle(label).fontVariantNumeric).toBe('normal');

	const withPercentage = await mountProgress(createMeta(['One', 'Two', 'Three']));
	const percentage = withPercentage.querySelector('.se-minimal-progress__percentage')!;

	expect(getComputedStyle(percentage).fontVariantNumeric).toBe('tabular-nums');
});

test('showPercentage false keeps the bar', async () => {
	const element = await mountProgress(createMeta(['One', 'Two', 'Three']), { showPercentage: false });

	expect(element.querySelector('[role="progressbar"]')).not.toBeNull();
	expect(element.textContent).not.toContain('%');
});
