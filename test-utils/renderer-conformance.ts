import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { getByRole, queryAllByRole, queryAllByText, queryByRole, queryByText, within } from '@testing-library/dom';
import { page, userEvent } from 'vitest/browser';
import * as v from 'valibot';
import { builtInAxes, defineAxis } from '@schema-engine/layout';
import type { BuilderActionRuntimeContext, FormConfigView } from '@schema-engine/forms';
import {
	builtInRecipeSpecs,
	MinimalProgressConfigSchema,
	SplitScreenShellConfigSchema,
	StepIndicatorsConfigSchema,
} from '@schema-engine/forms/recipes/built-in';

/**
 * A result whose `success` throws when the dispatcher reads it.
 *
 * @remarks
 * The dispatcher turns an exception thrown by an action into a failed result, so this is the way an
 * action makes the dispatch itself reject.
 */
function rejectingResult(): { success: boolean } {
	return {
		get success(): boolean {
			throw new Error('Dispatch rejected');
		},
	};
}

export const conformanceAction = {
	$type: 'conformance',
	schema: v.object({ $type: v.literal('conformance'), id: v.string(), triggers: v.optional(v.array(v.string())) }),
	metadata: { name: 'Conformance' },
	execute: vi.fn(async (context: BuilderActionRuntimeContext<{ id: string }>) => {
		if (context.config.id === 'reject-dispatch') return rejectingResult();
		return context.config.id === 'abort'
			? { success: false, shouldContinue: false, error: 'Submission stopped' }
			: { success: true };
	}),
};

/**
 * The host axis every conformance engine adds beside the built-in ones.
 *
 * @remarks `brand` sets `--se-tone-accent`, which the host-axis test reads back from computed style.
 */
export const conformanceToneAxis = defineAxis({
	$type: 'tone',
	metadata: { name: 'Tone' },
	default: 'neutral',
	values: { neutral: {}, brand: { '--se-tone-accent': 'rgb(255, 102, 0)' } },
});

/** The axes the conformance input registration declares: the built-in `size` and the host `tone`. */
export const conformanceInputAxes = ['size', 'tone'];

/** The `layout` option of every conformance engine: the built-in axes plus {@link conformanceToneAxis}. */
export const conformanceLayout = { appearance: [...builtInAxes, conformanceToneAxis] } as const;

/**
 * `$type` each renderer registers with `containerKind: 'array'` and its array widget.
 *
 * @remarks
 * Each registration reuses its built-in array widget unchanged. Its props type pins
 * `$type: 'arrayElements'`, which the widget never reads, so the registration
 * widens the widget to `Omit<ArrayElementsProps, '$type'>` rather than rewriting
 * `$type` at runtime, where it would mask a leftover `$type` check.
 */
export const customArrayType = 'repeater';

export interface ConformanceMountOptions {
	config: FormConfigView;
	defaultValues?: Record<string, unknown>;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onChange?: (data: Record<string, unknown>) => void;
	onAction?: () => void;
}
export type ConformanceMount = (options: ConformanceMountOptions) => Promise<{
	host: HTMLElement;
	cleanup: () => void;
	/** Renders the same renderer again with a replaced config and the original callbacks. */
	update: (config: FormConfigView) => Promise<void>;
}>;

const lastActionContext = () => conformanceAction.execute.mock.calls.at(-1)?.[0];
const input = (name: string, label: string) => ({ $type: 'input', id: name, name, label });
const form = (elements: FormConfigView['steps'][number]['elements']): FormConfigView => ({
	id: 'conformance',
	steps: [
		{
			id: 'main',
			title: 'Main',
			elements: [...elements, { $type: 'submit', id: 'submit', name: 'conformanceSubmit', label: 'Submit' }],
		},
	],
});

const wizard = (...steps: FormConfigView['steps'][number]['elements'][]): FormConfigView => ({
	id: 'conformance',
	view: { $type: 'wizard', actions: { showStepCounter: true } },
	steps: steps.map((elements, index) => ({ id: `step${index}`, title: `Step ${index + 1}`, elements })),
});

const recipeTitles = ['Profile', 'Plan', 'Review'];
const formTitle = 'Account setup';
const headerLabels = { stepCounter: 'Section {current} of {total}' };
const indicatorLabels = { regionAriaLabel: 'Application progress', completed: 'Done' };
const progressLabels = { progress: 'Application progress', valueText: 'Stage {current} of {total}' };
const wizardActionLabels = {
	previous: 'Back',
	previousAriaLabel: 'Back one step',
	next: 'Continue',
	nextAriaLabel: 'Continue to next step',
	submit: 'Send',
	submitAriaLabel: 'Send application',
	stepCounter: 'Page {current} of {total}',
};
const singleActionLabels = { submit: 'Send', submitAriaLabel: 'Send application' };

interface RecipeCase {
	$type: string;
	steps: number;
	header: boolean;
	progress: 'indicators' | 'minimal' | undefined;
	sideContent?: string;
}

/**
 * @remarks
 * Derived from the built-in specs so a new built-in recipe cannot skip conformance: the declared
 * slots come from each spec's slot schemas, and the progress kind from the schema it uses.
 */
const recipeCases: RecipeCase[] = Object.values(builtInRecipeSpecs).map((spec) => {
	const schemas: Partial<Record<string, unknown>> = spec.slotSchemas;
	const progress = schemas.progress;
	return {
		$type: spec.$type,
		steps: spec.kind === 'wizard' ? 3 : 1,
		header: 'header' in schemas,
		progress:
			progress === StepIndicatorsConfigSchema
				? 'indicators'
				: progress === MinimalProgressConfigSchema
					? 'minimal'
					: undefined,
		sideContent: schemas.shell === SplitScreenShellConfigSchema ? 'Welcome aboard' : undefined,
	};
});

const recipeForm = ({ $type, steps, header, progress, sideContent }: RecipeCase): FormConfigView => {
	const wizardKind = steps > 1;
	const view: { $type: string; [slot: string]: unknown } = {
		$type,
		actions: wizardKind
			? { labels: wizardActionLabels, showStepCounter: true }
			: { labels: singleActionLabels, align: 'center' },
	};
	if (header) {
		view.header = { align: 'center', titleAs: 'h1', showStepCounter: true, labels: headerLabels };
	}
	if (progress === 'indicators') view.progress = { labels: indicatorLabels };
	if (progress === 'minimal') view.progress = { labels: progressLabels };
	if (sideContent) view.shell = { sideContent };
	return {
		id: 'conformance',
		title: formTitle,
		view,
		steps: recipeTitles.slice(0, steps).map((title, index) => ({
			id: `step${index}`,
			title,
			elements: [input(`field${index}`, `Field ${index + 1}`)],
		})),
	};
};

/** The built-in recipes whose shell declares `size` alone, and the picks the spacing checks make. */
const SPACED_RECIPES = ['hero-background', 'hero-wizard', 'sidebar-wizard', 'split-screen', 'split-screen-wizard'];
const SIZES = ['compact', 'comfortable'] as const;

/** The viewports the shell spacing checks pin: below and above the shells' 768px breakpoint. */
const MOBILE_VIEWPORT = { width: 414, height: 896 };
const DESKTOP_VIEWPORT = { width: 1100, height: 700 };
const DESKTOP_RECIPES = ['sidebar-wizard', 'split-screen'];

/**
 * What a `size` pick on the shell slot of each spaced recipe measures, in CSS pixels.
 *
 * @remarks
 * The hero pads itself and centres a 28rem column, the sidebar gaps its slots and the split screen pads its
 * content panel. A shell that stopped reading `--se-space` would keep its unpicked spacing instead.
 */
const DESKTOP_SHELL_MEASURES: Record<string, Record<(typeof SIZES)[number], { padding: string; insetLeft: number }>> = {
	'sidebar-wizard': {
		compact: { padding: '0px', insetLeft: 321 },
		comfortable: { padding: '0px', insetLeft: 353 },
	},
	'split-screen': {
		compact: { padding: '0px', insetLeft: 616 },
		comfortable: { padding: '0px', insetLeft: 632 },
	},
};

const SPACED_SHELL_MEASURES: Record<
	string,
	Record<(typeof SIZES)[number], { padding: string; gap: string; insetLeft: number }>
> = {
	'hero-background': {
		compact: { padding: '16px', gap: 'normal', insetLeft: 392 },
		comfortable: { padding: '32px', gap: 'normal', insetLeft: 408 },
	},
	'hero-wizard': {
		compact: { padding: '16px', gap: 'normal', insetLeft: 392 },
		comfortable: { padding: '32px', gap: 'normal', insetLeft: 408 },
	},
	'sidebar-wizard': {
		compact: { padding: '0px', gap: '16px', insetLeft: 0 },
		comfortable: { padding: '0px', gap: '32px', insetLeft: 0 },
	},
	'split-screen': {
		compact: { padding: '0px', gap: 'normal', insetLeft: 16 },
		comfortable: { padding: '0px', gap: 'normal', insetLeft: 32 },
	},
	'split-screen-wizard': {
		compact: { padding: '0px', gap: 'normal', insetLeft: 16 },
		comfortable: { padding: '0px', gap: 'normal', insetLeft: 32 },
	},
};

/** @remarks The element a form's `className`, `style` and `appearance` land on: `<form>` in React, `<rui-form>` in Radiant. */
const formElement = (host: HTMLElement) => {
	const element = host.querySelector<HTMLElement>('rui-form, form');
	if (!element) throw new Error('No form element rendered.');
	return element;
};
const stepElement = (host: HTMLElement, id: string) => {
	const element = host.querySelector<HTMLElement>(`[data-se-step="${id}"]`);
	if (!element) throw new Error(`No element rendered for step '${id}'.`);
	return element;
};
const fieldHost = (host: HTMLElement, label: string) => {
	const element = getByRole(host, 'textbox', { name: label }).closest<HTMLElement>('.se-grid-item');
	if (!element) throw new Error(`No field host rendered for '${label}'.`);
	return element;
};
const activeIndicator = (host: HTMLElement) =>
	within(getByRole(host, 'navigation', { name: 'Application progress' }))
		.getAllByRole('button')
		.filter((button) => button.getAttribute('aria-current') === 'step');
const actionIds = () => conformanceAction.execute.mock.calls.map(([context]) => context.config.id);

const sizedForm = (
	appearance: Record<string, string>,
	fieldAppearance?: Record<string, string>,
	fieldClassName?: string,
) => ({
	...form([
		{ ...input('email', 'Email'), appearance: fieldAppearance, className: fieldClassName },
		input('name', 'Name'),
	]),
	appearance,
});

/**
 * Reads the computed geometry of the card that carries a shell pick.
 *
 * @remarks
 * The card is the element that holds the pick and the field, and its section is the child that holds the
 * field, so the lookup names no renderer class. The host is made wider than the widest card, so the width
 * is the shell's own readable measure, not the viewport's.
 */
function readCardGeometry(host: HTMLElement, appearance: Record<string, string>) {
	host.style.width = '1200px';
	const textbox = getByRole(host, 'textbox', { name: 'Field 1' });
	const picked = Object.entries(appearance)
		.map(([axis, value]) => `[data-se-${axis}="${value}"]`)
		.join('');
	const card = Array.from(host.querySelectorAll<HTMLElement>(picked)).find(
		(element) =>
			element !== formElement(host) &&
			element !== stepElement(host, 'step0') &&
			!element.classList.contains('se-grid-item') &&
			element.contains(textbox),
	);
	if (!card) throw new Error('No card carries the pick.');
	const section = Array.from(card.children).find((child) => child.contains(textbox));
	if (!section) throw new Error('No card section holds the field.');
	const style = getComputedStyle(card);
	return {
		padding: getComputedStyle(section).paddingTop,
		width: card.getBoundingClientRect().width,
		borderWidth: style.borderTopWidth,
		boxShadow: style.boxShadow,
	};
}

/** @remarks The unpicked card shadow, resolved on a probe so each renderer's own colour resolution is compared. */
function defaultCardShadow() {
	const probe = document.createElement('div');
	probe.style.boxShadow = '0 8px 24px color-mix(in srgb, #000 10%, transparent)';
	document.body.append(probe);
	const shadow = getComputedStyle(probe).boxShadow;
	probe.remove();
	return shadow;
}

/** The card recipe's form, with a shell pick. */
function cardForm(appearance: Record<string, string>): FormConfigView {
	const cardCase = recipeCases.find((recipe) => recipe.$type === 'card');
	if (!cardCase) throw new Error('The card recipe has no conformance case.');
	const base = recipeForm(cardCase);
	return { ...base, view: { ...base.view, $type: 'card', shell: { appearance } } };
}

/** @remarks Both browser projects execute these assertions against their own FormRenderer. */
export function rendererConformance(mount: ConformanceMount): void {
	describe('FormRenderer conformance', () => {
		let cleanup: (() => void) | undefined;
		afterEach(() => {
			cleanup?.();
			cleanup = undefined;
			conformanceAction.execute.mockClear();
		});
		const setup = async (options: ConformanceMountOptions) => {
			const result = await mount(options);
			cleanup = result.cleanup;
			return result;
		};
		const cardGeometry = async (appearance: Record<string, string>) => {
			const { host } = await setup({ config: cardForm(appearance) });
			return readCardGeometry(host, appearance);
		};
		describe('class and custom properties', () => {
			test('a step renders its className and custom properties', async () => {
				const base = form([input('email', 'Email')]);
				const { host } = await setup({
					config: {
						...base,
						steps: [{ ...base.steps[0], className: 'checkout-step', style: { '--accent': '#f60' } }],
					},
				});
				const step = stepElement(host, 'main');
				expect(step.classList.contains('checkout-step')).toBe(true);
				expect(step.style.getPropertyValue('--accent')).toBe('#f60');
			});
			test('a step without className or style carries neither', async () => {
				const { host } = await setup({ config: form([input('email', 'Email')]) });
				const step = stepElement(host, 'main');
				expect(step.className).not.toContain('undefined');
				expect(step.getAttribute('style') ?? '').toBe('');
			});
			test('step className and style leave wizard step visibility to the navigation', async () => {
				const config = wizard([input('first', 'First')], [input('last', 'Last')]);
				const { host } = await setup({
					config: {
						...config,
						steps: config.steps.map((step) => ({
							...step,
							className: `styled-${step.id}`,
							style: { '--accent': step.id },
						})),
					},
				});
				const first = stepElement(host, 'step0');
				const second = host.querySelector<HTMLElement>('[data-se-step="step1"]');
				expect(first.classList.contains('styled-step0')).toBe(true);
				expect(first.style.getPropertyValue('--accent')).toBe('step0');
				expect(first.hidden).toBe(false);
				expect(second === null || second.hidden).toBe(true);
				await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
				await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Last' }).length).toBe(1);
				const entered = stepElement(host, 'step1');
				expect(entered.classList.contains('styled-step1')).toBe(true);
				expect(entered.style.getPropertyValue('--accent')).toBe('step1');
				expect(entered.hidden).toBe(false);
			});
			test('a form and a field render their custom properties', async () => {
				const base = form([{ ...input('email', 'Email'), style: { '--gap': '2rem', '--columns': 2 } }]);
				const { host } = await setup({ config: { ...base, style: { '--gap': '3rem' } } });
				expect(formElement(host).style.getPropertyValue('--gap')).toBe('3rem');
				expect(fieldHost(host, 'Email').style.getPropertyValue('--gap')).toBe('2rem');
				expect(fieldHost(host, 'Email').style.getPropertyValue('--columns')).toBe('2');
			});
		});
		describe('appearance', () => {
			test('a form-level value reaches the form, the step and a field without its own', async () => {
				const { host } = await setup({ config: sizedForm({ size: 'compact' }) });
				expect(formElement(host).getAttribute('data-se-size')).toBe('compact');
				expect(stepElement(host, 'main').getAttribute('data-se-size')).toBe('compact');
				expect(fieldHost(host, 'Name').getAttribute('data-se-size')).toBe('compact');
			});
			test('a field overrides the form value and its neighbours keep it', async () => {
				const { host } = await setup({ config: sizedForm({ size: 'compact' }, { size: 'comfortable' }) });
				expect(fieldHost(host, 'Email').getAttribute('data-se-size')).toBe('comfortable');
				expect(fieldHost(host, 'Name').getAttribute('data-se-size')).toBe('compact');
			});
			test('a step overrides the form value', async () => {
				const base = sizedForm({ size: 'compact' });
				const { host } = await setup({
					config: { ...base, steps: [{ ...base.steps[0], appearance: { size: 'default' } }] },
				});
				expect(formElement(host).getAttribute('data-se-size')).toBe('compact');
				expect(stepElement(host, 'main').getAttribute('data-se-size')).toBe('default');
				expect(fieldHost(host, 'Name').getAttribute('data-se-size')).toBe('default');
			});
			test('a form without appearance emits no appearance attributes', async () => {
				const { host } = await setup({ config: form([input('email', 'Email')]) });
				const attributed = Array.from(host.querySelectorAll('*')).filter((element) =>
					element.getAttributeNames().some((name) => /^data-se-(size|surface)$/.test(name)),
				);
				expect(attributed).toHaveLength(0);
			});
			test('a recipe slot takes an appearance', async () => {
				const cardCase = recipeCases.find((recipe) => recipe.$type === 'card');
				if (!cardCase) throw new Error('The card recipe has no conformance case.');
				const base = recipeForm(cardCase);
				const { host } = await setup({
					config: {
						...base,
						view: { ...base.view, $type: 'card', shell: { appearance: { surface: 'elevated' } } },
					},
				});
				const shells = host.querySelectorAll<HTMLElement>('[data-se-surface="elevated"]');
				expect(shells).toHaveLength(1);
				expect(shells[0]).not.toBe(formElement(host));
				expect(shells[0].contains(getByRole(host, 'textbox', { name: 'Field 1' }))).toBe(true);
			});
			test('a form-level value reaches a slot that supports the axis', async () => {
				const cardCase = recipeCases.find((recipe) => recipe.$type === 'card');
				if (!cardCase) throw new Error('The card recipe has no conformance case.');
				const { host } = await setup({ config: { ...recipeForm(cardCase), appearance: { size: 'compact' } } });
				const textbox = getByRole(host, 'textbox', { name: 'Field 1' });
				const shell = Array.from(host.querySelectorAll<HTMLElement>('[data-se-size="compact"]')).find(
					(element) =>
						element !== formElement(host) &&
						element !== stepElement(host, 'step0') &&
						element !== fieldHost(host, 'Field 1') &&
						element.contains(textbox),
				);
				expect(shell).toBeDefined();
			});
			test('structural slot config is unaffected by appearance', async () => {
				const config: FormConfigView = {
					id: 'conformance',
					view: {
						$type: 'card-wizard',
						header: { showDescription: false },
						shell: { appearance: { size: 'compact' } },
					},
					steps: [
						{ id: 'one', title: 'One', description: 'Hidden description', elements: [input('a', 'A')] },
						{ id: 'two', title: 'Two', elements: [input('b', 'B')] },
					],
				};
				const { host } = await setup({ config });
				expect(host.querySelector('[data-se-size="compact"]')).not.toBeNull();
				expect(getByRole(host, 'heading', { name: 'One' })).toBeTruthy();
				expect(queryByText(host, 'Hidden description')).toBeNull();
			});
			test('axis tokens apply to the element that carries the attribute', async () => {
				const { host } = await setup({ config: sizedForm({ size: 'compact' }) });
				expect(getComputedStyle(formElement(host)).getPropertyValue('--se-space')).toBe('1rem');
				expect(getComputedStyle(fieldHost(host, 'Email')).getPropertyValue('--se-space')).toBe('1rem');
			});
			test('a host axis reaches the form and the step as an attribute and as its tokens', async () => {
				const { host } = await setup({
					config: { ...form([input('email', 'Email')]), appearance: { tone: 'brand' } },
				});
				for (const element of [formElement(host), stepElement(host, 'main')]) {
					expect(element.getAttribute('data-se-tone')).toBe('brand');
					expect(getComputedStyle(element).getPropertyValue('--se-tone-accent').trim()).toBe(
						'rgb(255, 102, 0)',
					);
				}
			});
			test('a field whose registration declares a host axis carries its own pick, and the form pick otherwise', async () => {
				const { host } = await setup({
					config: {
						...form([{ ...input('email', 'Email'), appearance: { tone: 'brand' } }, input('name', 'Name')]),
						appearance: { tone: 'neutral' },
					},
				});
				const email = fieldHost(host, 'Email');
				expect(email.getAttribute('data-se-tone')).toBe('brand');
				expect(getComputedStyle(email).getPropertyValue('--se-tone-accent').trim()).toBe('rgb(255, 102, 0)');
				expect(fieldHost(host, 'Name').getAttribute('data-se-tone')).toBe('neutral');
			});
			test('a host axis value that sets no token leaves the neighbours alone', async () => {
				const { host } = await setup({
					config: { ...form([input('email', 'Email')]), appearance: { tone: 'neutral' } },
				});
				expect(formElement(host).getAttribute('data-se-tone')).toBe('neutral');
				expect(getComputedStyle(formElement(host)).getPropertyValue('--se-tone-accent').trim()).toBe('');
			});
			test('a field className lands on the field host', async () => {
				const { host } = await setup({
					config: form([{ ...input('email', 'Email'), className: 'author-field' }, input('name', 'Name')]),
				});
				expect(fieldHost(host, 'Email').classList.contains('author-field')).toBe(true);
				expect(fieldHost(host, 'Name').classList.contains('author-field')).toBe(false);
			});
			test('an author class on a field outranks the field axis styles', async () => {
				const author = document.createElement('style');
				author.textContent = '.author-field { --se-space: 7px; }';
				document.head.prepend(author);
				try {
					const { host } = await setup({
						config: sizedForm({ size: 'compact' }, { size: 'comfortable' }, 'author-field'),
					});
					expect(getComputedStyle(fieldHost(host, 'Email')).getPropertyValue('--se-space')).toBe('7px');
					expect(getComputedStyle(fieldHost(host, 'Name')).getPropertyValue('--se-space')).not.toBe('7px');
				} finally {
					author.remove();
				}
			});
			test('an author class outranks axis styles', async () => {
				const author = document.createElement('style');
				author.textContent = '.author-padding { --se-space: 7px; }';
				document.head.prepend(author);
				try {
					const { host } = await setup({
						config: { ...sizedForm({ size: 'compact' }), className: 'author-padding' },
					});
					expect(getComputedStyle(formElement(host)).getPropertyValue('--se-space')).toBe('7px');
				} finally {
					author.remove();
				}
			});
		});
		/**
		 * The shared field and action layout, run against both renderers with their own stylesheets.
		 *
		 * @remarks
		 * The agreed contract is a field's font size from the `size` token (`--se-font-size`), a text input that
		 * fills its field, and the action bar's `align`. Padding, borders, control heights and the rest of a
		 * field's look are renderer styling.
		 */
		describe('field and action layout parity', () => {
			test.each([
				['compact', '14px'],
				['comfortable', '17px'],
			])('a field with size %s has the same font size in every renderer', async (size, fontSize) => {
				const { host } = await setup({ config: sizedForm({ size: 'default' }, { size }) });
				expect(getComputedStyle(fieldHost(host, 'Email')).fontSize).toBe(fontSize);
				expect(getComputedStyle(fieldHost(host, 'Name')).fontSize).not.toBe(fontSize);
			});
			test('a field without a size pick keeps the font size it inherits', async () => {
				const { host } = await setup({ config: form([input('email', 'Email')]) });
				expect(getComputedStyle(fieldHost(host, 'Email')).fontSize).toBe(
					getComputedStyle(formElement(host)).fontSize,
				);
			});
			test('a text input fills its field', async () => {
				const { host } = await setup({ config: cardForm({ size: 'default' }) });
				host.style.width = '1200px';
				const field = fieldHost(host, 'Field 1').getBoundingClientRect();
				const textbox = getByRole(host, 'textbox', { name: 'Field 1' }).getBoundingClientRect();
				expect(textbox.width).toBe(field.width);
				expect(textbox.left).toBe(field.left);
			});
			test.each([
				['start', 'left'],
				['center', 'center'],
				['end', 'right'],
			])('the action bar aligns its button at %s in every renderer', async (align, edge) => {
				const base = cardForm({ size: 'default' });
				const { host } = await setup({
					config: {
						...base,
						view: { ...base.view, $type: 'card', actions: { labels: singleActionLabels, align } },
					},
				});
				host.style.width = '1200px';
				const submit = getByRole(host, 'button', { name: 'Send application' });
				const button = submit.getBoundingClientRect();
				const bar = submit.parentElement!.getBoundingClientRect();
				expect(bar.width).toBeGreaterThan(button.width);
				if (edge === 'left') expect(button.left).toBe(bar.left);
				if (edge === 'right') expect(button.right).toBe(bar.right);
				if (edge === 'center') expect(button.left - bar.left).toBeCloseTo(bar.right - button.right, 0);
			});
		});
		/**
		 * The spacing parity checks of the shells that read the `size` token (`--se-space`) beside the card.
		 *
		 * @remarks
		 * Each shell that declares `size` alone gets the pick on its `shell` slot. The carrier is the element
		 * that holds the pick, and the measures are its own padding and how far the first field sits inside it,
		 * which add up the padding and gaps every panel between them takes from the token. The literals hold for
		 * the built-in `size` axis, no host theme variables and a viewport narrower than the shells' 768px
		 * breakpoint (the browser projects' default; a host element's width does not change a media query), where
		 * the split screen and the sidebar stack. Both renderers assert the same literals, so equal spacing follows from both suites passing.
		 */
		describe('shell spacing parity', () => {
			beforeAll(() => page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height));
			const shellAxes = (recipe: RecipeCase): readonly string[] => {
				const spec: { appearanceAxes?: Partial<Record<string, readonly string[]>> } | undefined = Object.values(
					builtInRecipeSpecs,
				).find((candidate) => candidate.$type === recipe.$type);
				return spec?.appearanceAxes?.shell ?? [];
			};
			const spacedRecipes = recipeCases.filter(
				(recipe) => shellAxes(recipe).includes('size') && !shellAxes(recipe).includes('surface'),
			);
			const measureShell = async (recipe: RecipeCase, size: (typeof SIZES)[number]) => {
				const base = recipeForm(recipe);
				const shell: Record<string, unknown> = { ...(base.view?.shell as Record<string, unknown> | undefined) };
				const { host } = await setup({
					config: {
						...base,
						view: { ...base.view, $type: recipe.$type, shell: { ...shell, appearance: { size } } },
					},
				});
				host.style.width = '1200px';
				const textbox = getByRole(host, 'textbox', { name: 'Field 1' });
				const carrier = Array.from(host.querySelectorAll<HTMLElement>(`[data-se-size="${size}"]`)).find(
					(element) =>
						element !== formElement(host) &&
						!element.classList.contains('se-form-field') &&
						!element.hasAttribute('data-se-step') &&
						element.contains(textbox),
				);
				if (!carrier) throw new Error(`No shell of ${recipe.$type} carries the pick.`);
				const inside = carrier.getBoundingClientRect();
				const field = fieldHost(host, 'Field 1').getBoundingClientRect();
				const style = getComputedStyle(carrier);
				return { padding: style.paddingTop, gap: style.rowGap, insetLeft: field.left - inside.left };
			};
			test('the viewport is below the 768px breakpoint the literals assume', () => {
				expect(window.innerWidth).toBeLessThan(768);
			});
			describe('at a desktop width', () => {
				beforeAll(() => page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height));
				afterAll(() => page.viewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height));
				test.each(DESKTOP_RECIPES.flatMap((type) => SIZES.map((size) => [type, size] as const)))(
					'%s with size %s has the same spacing in every renderer',
					async (type, size) => {
						const recipe = recipeCases.find((candidate) => candidate.$type === type);
						if (!recipe) throw new Error(`No conformance case for ${type}.`);
						expect(window.innerWidth).toBeGreaterThanOrEqual(1024);
						const { padding, insetLeft } = await measureShell(recipe, size);
						expect({ padding, insetLeft }).toEqual(DESKTOP_SHELL_MEASURES[type]?.[size]);
					},
				);
			});
			test('the spaced recipes are found', () => {
				expect(spacedRecipes.map((recipe) => recipe.$type).toSorted()).toEqual(SPACED_RECIPES);
			});
			test.each(SPACED_RECIPES.flatMap((type) => SIZES.map((size) => [type, size] as const)))(
				'%s with size %s has the same spacing in every renderer',
				async (type, size) => {
					const recipe = recipeCases.find((candidate) => candidate.$type === type);
					if (!recipe) throw new Error(`No conformance case for ${type}.`);
					expect(await measureShell(recipe, size)).toEqual(SPACED_SHELL_MEASURES[type]?.[size]);
				},
			);
		});
		/**
		 * The card parity checks, run against both renderers with their own stylesheets.
		 *
		 * @remarks
		 * The expected values are literals, which hold only for the built-in `size` and `surface` axes, no
		 * host theme variables (`--space-4`, `--space-6`, `--space-8`, `--surface`, `--on-surface`, `--border`)
		 * and a host wider than the widest card. A themed host changes them; Radiant's own tests cover that.
		 * Both renderers assert the same literals, so equal geometry follows from both suites passing.
		 */
		describe('card appearance parity', () => {
			test('a card with size comfortable and surface elevated has the same geometry in every renderer', async () => {
				expect(await cardGeometry({ size: 'comfortable', surface: 'elevated' })).toEqual({
					padding: '32px',
					width: 512,
					borderWidth: '1px',
					boxShadow: defaultCardShadow(),
				});
			});
			test.each([
				['compact', '16px', 384],
				['default', '24px', 448],
				['comfortable', '32px', 512],
			])('card size %s has the same padding and width in every renderer', async (size, padding, width) => {
				expect(await cardGeometry({ size })).toMatchObject({ padding, width });
			});
			test.each([
				['flat', '0px', 'none'],
				['outlined', '1px', 'none'],
				['elevated', '1px', undefined],
			])('card surface %s has the same border and shadow in every renderer', async (surface, border, shadow) => {
				expect(await cardGeometry({ surface })).toMatchObject({
					borderWidth: border,
					boxShadow: shadow ?? defaultCardShadow(),
				});
			});
		});
		test('resolves sibling show constraints independently in two array rows', async () => {
			const { host } = await setup({
				config: form([
					{
						$type: 'arrayElements',
						id: 'contacts',
						name: 'contacts',
						elements: [
							input('kind', 'Kind'),
							{
								...input('email', 'Email'),
								constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'show' }],
							},
						],
					},
				]),
				defaultValues: { contacts: [{ kind: '' }, { kind: '' }] },
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Kind' }).length).toBe(2);
			expect(queryAllByRole(host, 'textbox', { name: 'Email' })).toHaveLength(0);
			await userEvent.fill(queryAllByRole(host, 'textbox', { name: 'Kind' })[0], 'business');
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Email' }).length).toBe(1);
			expect(getByRole(host, 'textbox', { name: 'Email' }).getAttribute('name')).toBe('contacts.0.email');
		});
		describe('format rules on an optional field', () => {
			const optionalEmail = () =>
				form([{ ...input('email', 'Email'), rules: [{ type: 'email', message: 'Bad email' }] }]);
			test('an optional email field can be left empty', async () => {
				const onSubmit = vi.fn();
				const { host } = await setup({ config: optionalEmail(), onSubmit });
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
				expect(queryByText(host, 'Bad email')).toBeNull();
			});
			test('an optional field with a pattern and a minLength rule can be left empty', async () => {
				const onSubmit = vi.fn();
				const { host } = await setup({
					config: form([
						{
							...input('code', 'Code'),
							rules: [
								{ type: 'pattern', value: '^[a-z]+$', message: 'Letters only' },
								{ type: 'minLength', value: 3, message: 'Too short' },
							],
						},
					]),
					onSubmit,
				});
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
				expect(queryByText(host, 'Letters only')).toBeNull();
				expect(queryByText(host, 'Too short')).toBeNull();
			});
			test('a filled optional email field is still checked', async () => {
				const onSubmit = vi.fn();
				const { host } = await setup({ config: optionalEmail(), onSubmit });
				await userEvent.fill(getByRole(host, 'textbox', { name: 'Email' }), 'not-an-email');
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(() => queryAllByText(host, 'Bad email').length).toBeGreaterThan(0);
				expect(onSubmit).not.toHaveBeenCalled();
			});
		});
		test('both renderers add the same row', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					{
						$type: 'arrayElements',
						id: 'members',
						name: 'members',
						initialValues: { role: 'user' },
						elements: [{ ...input('fullName', 'Name'), defaultValue: 'x' }, input('role', 'Role')],
					},
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Name' }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Name' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			const row = { fullName: 'x', role: 'user' };
			expect(onSubmit).toHaveBeenCalledWith({ members: [row, row] });
		});
		test('a single-child array keeps object rows from form defaultValues', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					{ $type: 'arrayElements', id: 'members', name: 'members', elements: [input('role', 'Role')] },
				]),
				defaultValues: { members: [{ role: 'admin' }] },
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Role' }).length).toBe(1);
			expect(getByRole(host, 'textbox', { name: 'Role' }).getAttribute('name')).toBe('members.0.role');
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Role' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ members: [{ role: 'admin' }, { role: '' }] });
		});
		test('both renderers add the same scalar row', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					{
						$type: 'arrayElements',
						id: 'tags',
						name: 'tags',
						elements: [{ ...input('tag', 'Tag'), defaultValue: 'x' }],
					},
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ tags: ['x', 'x'] });
		});
		test('keeps empty scalar rows seeded to minItems and added after them', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					{ $type: 'arrayElements', id: 'tags', name: 'tags', minItems: 2, elements: [input('tag', 'Tag')] },
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: 'Add item' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(3);
			await userEvent.fill(queryAllByRole(host, 'textbox', { name: 'Tag' })[2], 'c');
			await userEvent.click(queryAllByRole(host, 'button', { name: 'Remove item 1' })[0]);
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Tag' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ tags: ['', 'c'] });
		});
		test(`seeds a custom array registration (${customArrayType}) to minItems`, async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					{
						$type: customArrayType,
						id: 'tags',
						name: 'tags',
						minItems: 2,
						elements: [input('label', 'Label'), input('color', 'Color')],
					},
				]),
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Label' }).length).toBe(2);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			const row = { label: '', color: '' };
			expect(onSubmit).toHaveBeenCalledWith({ tags: [row, row] });
		});
		const address = {
			$type: 'fieldSet',
			id: 'address',
			name: 'address',
			elements: [
				{ ...input('street', 'Street'), rules: [{ type: 'required' as const, message: 'Street is required' }] },
			],
		};
		test('wizard Next validates a required child inside a fieldset', async () => {
			const base = form([address]);
			const config: FormConfigView = {
				...base,
				view: { $type: 'wizard', actions: { showStepCounter: true } },
				steps: [...base.steps, { id: 'second', title: 'Second', elements: [input('last', 'Last')] }],
			};
			const { host } = await setup({ config });
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			expect(queryAllByRole(host, 'textbox', { name: 'Last' })).toHaveLength(0);
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Street/ }), 'Main Street');
			await userEvent.tab();
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Last' }).length).toBe(1);
		});
		test('dispatches step leave, change and enter when the wizard advances', async () => {
			const { host } = await setup({
				config: {
					...wizard([input('first', 'First')], [input('last', 'Last')]),
					actions: [
						{ $type: 'conformance', id: 'leave', triggers: ['step_leave'] },
						{ $type: 'conformance', id: 'change', triggers: ['step_change'] },
						{ $type: 'conformance', id: 'enter', triggers: ['step_enter'] },
					],
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect
				.poll(() =>
					conformanceAction.execute.mock.calls.map(([context]) => [context.config.id, context.currentStep]),
				)
				.toEqual([
					['leave', 0],
					['change', 1],
					['enter', 1],
				]);
		});
		test('runs the current step actions after the form actions on each step trigger', async () => {
			const [first, second] = wizard([input('first', 'First')], [input('last', 'Last')]).steps;
			const { host } = await setup({
				config: {
					...wizard(),
					actions: [{ $type: 'conformance', id: 'form-enter', triggers: ['step_enter'] }],
					steps: [
						{
							...first,
							actions: [
								{ $type: 'conformance', id: 'leave-first', triggers: ['step_leave'] },
								{ $type: 'conformance', id: 'enter-first', triggers: ['step_enter'] },
								{ $type: 'conformance', id: 'change-first', triggers: ['step_change'] },
							],
						},
						{
							...second,
							actions: [
								{ $type: 'conformance', id: 'change-second', triggers: ['step_change'] },
								{ $type: 'conformance', id: 'enter-second', triggers: ['step_enter'] },
							],
						},
					],
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(actionIds).toEqual(['leave-first', 'change-second', 'form-enter', 'enter-second']);
		});
		test('change and submit triggers run only the current step actions when the form has none', async () => {
			const onSubmit = vi.fn();
			const [first, last] = wizard([input('first', 'First')], [input('last', 'Last')]).steps;
			const { host } = await setup({
				config: {
					...wizard(),
					steps: [
						{
							...first,
							actions: [
								{ $type: 'conformance', id: 'first-change', triggers: ['form_change'] },
								{ $type: 'conformance', id: 'first-submit', triggers: ['form_submit'] },
							],
						},
						{
							...last,
							actions: [
								{ $type: 'conformance', id: 'last-change', triggers: ['form_change'] },
								{ $type: 'conformance', id: 'last-submit', triggers: ['form_submit'] },
							],
						},
					],
				},
				onSubmit,
			});
			await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: 'Last' }).length).toBe(1);
			conformanceAction.execute.mockClear();
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Last' }), 'Lovelace');
			await expect.poll(actionIds).toContain('last-change');
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.click(getByRole(host, 'button', { name: 'Submit form' }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(actionIds().filter((id, index, ids) => id !== ids[index - 1])).toEqual([
				'last-change',
				'last-submit',
			]);
		});
		test('a config replaced while Next validates keeps the new form on its first step', async () => {
			const pending: Array<(response: Response) => void> = [];
			vi.stubGlobal(
				'fetch',
				vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))),
			);
			const config: FormConfigView = {
				...wizard(
					[
						{
							...input('handle', 'Handle'),
							rules: [{ type: 'async', url: '/conformance-race', debounce: 0, disableCache: true }],
						},
					],
					[input('second', 'Second')],
					[input('third', 'Third')],
				),
				actions: [
					{ $type: 'conformance', id: 'change', triggers: ['step_change'] },
					{ $type: 'conformance', id: 'enter', triggers: ['step_enter'] },
				],
			};
			try {
				const { host, update } = await setup({ config });
				await userEvent.fill(getByRole(host, 'textbox', { name: 'Handle' }), 'ada');
				await userEvent.click(getByRole(host, 'button', { name: 'Go to next step' }));
				await expect.poll(() => pending.length).toBeGreaterThan(0);
				await update({ ...config, id: 'conformance-replaced' });
				let read = 0;
				for (const resolve of pending.splice(0)) {
					const response = new Response(JSON.stringify({ valid: true }));
					const json = response.json.bind(response);
					response.json = () => {
						read += 1;
						return json();
					};
					resolve(response);
				}
				await expect.poll(() => read).toBeGreaterThan(0);
				await new Promise((resolve) => setTimeout(resolve, 50));
				expect(actionIds()).toEqual([]);
				expect(queryAllByRole(host, 'textbox', { name: 'Second' })).toHaveLength(0);
				expect(queryAllByRole(host, 'textbox', { name: 'Handle' })).toHaveLength(1);
			} finally {
				vi.unstubAllGlobals();
			}
		});
		test('ignores Next activated again before step validation finishes', async () => {
			const { host } = await setup({
				config: {
					...wizard(
						[input('first', 'First')],
						[
							{
								...input('second', 'Second'),
								rules: [{ type: 'required', message: 'Second is required' }],
							},
						],
						[input('third', 'Third')],
					),
					actions: [{ $type: 'conformance', id: 'change', triggers: ['step_change'] }],
				},
			});
			const next = getByRole(host, 'button', { name: 'Go to next step' });
			next.click();
			next.click();
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /^Second/ }).length).toBe(1);
			await expect.poll(actionIds).toEqual(['change']);
			expect(queryAllByRole(host, 'textbox', { name: 'Third' })).toHaveLength(0);
			expect(queryByText(host, 'Second is required')).toBeNull();
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Second/ }), 'filled');
			expect(actionIds()).toEqual(['change']);
		});
		test('clears a nested validation error after a failed submission', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({ config: { ...form([address]), reValidateMode: 'onChange' }, onSubmit });
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.fill(getByRole(host, 'textbox', { name: /^Street/ }), 'Main Street');
			await userEvent.tab();
			await expect.poll(() => queryByText(host, 'Street is required')).toBeNull();
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith({ address: { street: 'Main Street' } });
		});
		test('handlers receive one errors shape', async () => {
			const { host } = await setup({
				config: {
					...form([address, input('note', 'Note')]),
					actions: [{ $type: 'conformance', id: 'changed', triggers: ['form_change'] }],
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => queryByText(host, 'Street is required') !== null).toBe(true);
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Note' }), 'Ring twice');
			await expect.poll(() => lastActionContext()?.formData.note).toBe('Ring twice');
			expect(lastActionContext()?.errors).toEqual({
				address: { street: expect.objectContaining({ message: 'Street is required' }) },
			});
		});
		test('a require constraint blocks submission until its condition is removed', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					input('kind', 'Kind'),
					{
						...input('vat', 'VAT'),
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
					},
				]),
				defaultValues: { kind: 'business', vat: '' },
				onSubmit,
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /VAT\s*\*/ }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect
				.poll(() => getByRole(host, 'textbox', { name: /VAT/ }).getAttribute('aria-invalid'))
				.toBe('true');
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Kind' }), 'personal');
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /VAT\s*\*/ }).length).toBe(0);
			await expect
				.poll(() => getByRole(host, 'textbox', { name: /VAT/ }).getAttribute('aria-invalid'))
				.toBe('false');
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'personal' }));
		});
		test('a fieldset require constraint makes its children required, nested containers included', async () => {
			const onSubmit = vi.fn();
			const { host } = await setup({
				config: form([
					input('kind', 'Kind'),
					{
						$type: 'fieldSet',
						id: 'company',
						name: 'company',
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
						elements: [
							input('vat', 'VAT'),
							{ $type: 'fieldSet', id: 'office', name: 'office', elements: [input('street', 'Street')] },
							{
								$type: 'arrayElements',
								id: 'phones',
								name: 'phones',
								elements: [input('phone', 'Phone')],
							},
						],
					},
				]),
				defaultValues: { kind: 'business', company: { phones: [''] } },
				onSubmit,
			});
			const required = ['VAT', 'Street', 'Phone'];
			await expect
				.poll(() => queryAllByRole(host, 'textbox', { name: /^(VAT|Street|Phone)\s*\*/ }).length)
				.toBe(3);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect
				.poll(() =>
					required.map((name) =>
						getByRole(host, 'textbox', { name: new RegExp(`^${name}`) }).getAttribute('aria-invalid'),
					),
				)
				.toEqual(['true', 'true', 'true']);
			expect(onSubmit).not.toHaveBeenCalled();
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Kind' }), 'personal');
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /\*/ }).length).toBe(0);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
		});
		test('an authored disabled array disables its rows and its add and remove controls', async () => {
			const onChange = vi.fn();
			const { host } = await setup({
				config: form([
					input('note', 'Note'),
					{
						$type: 'arrayElements',
						id: 'tags',
						name: 'tags',
						disabled: true,
						elements: [
							{
								...input('tag', 'Tag'),
								constraints: [{ field: 'note', operator: 'not_equals', value: 'hide', action: 'show' }],
							},
						],
					},
				]),
				defaultValues: { tags: ['a', 'b'] },
				onChange,
			});
			const disabledControls = () =>
				[
					...queryAllByRole(host, 'textbox', { name: 'Tag' }),
					...queryAllByRole(host, 'button', { name: /^(Add item|Remove item \d+)$/ }),
				].map((control) => (control as HTMLInputElement | HTMLButtonElement).disabled);
			await expect.poll(disabledControls).toEqual([true, true, true, true, true]);
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Note' }), 'shown');
			await expect.poll(() => onChange.mock.lastCall?.[0].note).toBe('shown');
			expect(disabledControls()).toEqual([true, true, true, true, true]);
		});
		test('a row error follows its row when an earlier empty scalar row is removed', async () => {
			const { host } = await setup({
				config: {
					...form([
						{
							$type: 'arrayElements',
							id: 'tags',
							name: 'tags',
							elements: [
								{ ...input('tag', 'Tag'), rules: [{ type: 'required', message: 'Tag is required' }] },
							],
						},
					]),
					validationMode: 'onBlur',
				},
				defaultValues: { tags: ['', '', ''] },
			});
			const tags = () => queryAllByRole(host, 'textbox', { name: /^Tag/ });
			await expect.poll(() => tags().length).toBe(3);
			await userEvent.click(tags()[2]);
			await userEvent.tab();
			await expect
				.poll(() => tags().map((tag) => tag.getAttribute('aria-invalid')))
				.toEqual(['false', 'false', 'true']);
			await userEvent.click(queryAllByRole(host, 'button', { name: 'Remove item 1' })[0]);
			await expect.poll(() => tags().map((tag) => tag.getAttribute('aria-invalid'))).toEqual(['false', 'true']);
			expect(queryAllByText(host, 'Tag is required')).toHaveLength(1);
		});
		test('an array require constraint makes its rows required', async () => {
			const { host } = await setup({
				config: form([
					input('kind', 'Kind'),
					{
						$type: 'arrayElements',
						id: 'phones',
						name: 'phones',
						constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'require' }],
						elements: [input('phone', 'Phone')],
					},
				]),
				defaultValues: { kind: 'business', phones: [''] },
			});
			await expect.poll(() => queryAllByRole(host, 'textbox', { name: /^Phone\s*\*/ }).length).toBe(1);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect
				.poll(() => getByRole(host, 'textbox', { name: /^Phone/ }).getAttribute('aria-invalid'))
				.toBe('true');
		});
		test('reValidateMode onBlur re-validates a field on blur, not on change', async () => {
			const { host } = await setup({
				config: {
					...form([
						{ ...input('fullName', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
					]),
					validationMode: 'onSubmit',
					reValidateMode: 'onBlur',
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
			await userEvent.type(getByRole(host, 'textbox', { name: /^Name/ }), 'Ada');
			expect(queryByText(host, 'Name is required')).not.toBeNull();
			await userEvent.tab();
			await expect.poll(() => queryByText(host, 'Name is required')).toBeNull();
		});
		test('validationMode onChange validates a field before the first submit', async () => {
			const { host } = await setup({
				config: {
					...form([
						{ ...input('fullName', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
					]),
					validationMode: 'onChange',
				},
			});
			await userEvent.type(getByRole(host, 'textbox', { name: /^Name/ }), 'a');
			await userEvent.clear(getByRole(host, 'textbox', { name: /^Name/ }));
			await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
		});
		test('submitCount counts submit attempts that failed validation', async () => {
			const { host } = await setup({
				config: {
					...form([
						{ ...input('fullName', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
					]),
					actions: [{ $type: 'conformance', id: 'submitted', triggers: ['form_submit'] }],
				},
			});
			const name = getByRole(host, 'textbox', { name: /^Name/ });
			await userEvent.click(name);
			await userEvent.tab();
			for (let attempt = 0; attempt < 2; attempt += 1) {
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
			}
			await userEvent.fill(name, 'Ada');
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(actionIds).toEqual(['submitted']);
			expect(lastActionContext()?.metadata.userInteractions).toBe(3);
		});
		describe('action context validity', () => {
			afterEach(() => {
				vi.unstubAllGlobals();
			});
			const stubFetch = (reply: (value: unknown) => { valid: boolean; message?: string }) => {
				const fetchStub = vi.fn(async (_url: unknown, init?: RequestInit) => {
					const { value } = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as {
						value: unknown;
					};
					return new Response(JSON.stringify(reply(value)));
				});
				vi.stubGlobal('fetch', fetchStub);
				return fetchStub;
			};
			const mountAction = { $type: 'conformance', id: 'mounted', triggers: ['form_mount'] };
			const changeAction = { $type: 'conformance', id: 'changed', triggers: ['form_change'] };
			test('actions that do not ask for validity cause no validation', async () => {
				const fetchStub = stubFetch(() => ({ valid: true }));
				const { host } = await setup({
					config: {
						...form([
							{
								...input('counted', 'Counted'),
								rules: [{ type: 'async', url: '/conformance-count', disableCache: true }],
							},
							input('other', 'Other'),
						]),
						validationMode: 'onSubmit',
						actions: [mountAction, changeAction],
					},
					defaultValues: { counted: 'x' },
				});
				await expect.poll(actionIds).toContain('mounted');
				await userEvent.type(getByRole(host, 'textbox', { name: 'Other' }), 'abc');
				await expect.poll(() => lastActionContext()?.formData.other).toBe('abc');
				await new Promise((resolve) => setTimeout(resolve, 100));
				expect(fetchStub).not.toHaveBeenCalled();
			});
			test('a form without actions runs no validator while the user types', async () => {
				const fetchStub = stubFetch(() => ({ valid: true }));
				const { host } = await setup({
					config: {
						...form([
							{
								...input('counted', 'Counted'),
								rules: [{ type: 'async', url: '/conformance-count', disableCache: true }],
							},
							input('other', 'Other'),
						]),
						validationMode: 'onSubmit',
					},
					defaultValues: { counted: 'x' },
				});
				await userEvent.type(getByRole(host, 'textbox', { name: 'Other' }), 'abc');
				await expect
					.poll(() => (getByRole(host, 'textbox', { name: 'Other' }) as HTMLInputElement).value)
					.toBe('abc');
				await new Promise((resolve) => setTimeout(resolve, 100));
				expect(fetchStub).not.toHaveBeenCalled();
			});
			test('an action asks for current validity without showing errors', async () => {
				const { host } = await setup({
					config: {
						...form([
							{ ...input('name', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
							input('note', 'Note'),
						]),
						actions: [changeAction],
					},
				});
				await userEvent.type(getByRole(host, 'textbox', { name: 'Note' }), 'hi');
				await expect.poll(() => lastActionContext()?.formData.note).toBe('hi');
				await expect(lastActionContext()?.form.checkValidity()).resolves.toBe(false);
				expect(queryByText(host, 'Name is required')).toBeNull();
				expect(lastActionContext()?.errors).toEqual({});
			});
			test('isValid reports recorded errors, not the validity of the values', async () => {
				const { host } = await setup({
					config: {
						...form([
							{ ...input('name', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
							input('note', 'Note'),
						]),
						actions: [mountAction, changeAction],
					},
				});
				await expect.poll(actionIds).toContain('mounted');
				const mounted = conformanceAction.execute.mock.calls.find(
					([context]) => context.config.id === 'mounted',
				);
				expect(mounted?.[0].isValid).toBe(true);
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
				await userEvent.type(getByRole(host, 'textbox', { name: 'Note' }), 'hi');
				await expect.poll(() => lastActionContext()?.formData.note).toBe('hi');
				expect(lastActionContext()?.isValid).toBe(false);
			});
			test('isValid and the interaction count follow an error recorded on blur', async () => {
				const { host } = await setup({
					config: {
						...form([
							{ ...input('name', 'Name'), rules: [{ type: 'required', message: 'Name is required' }] },
							input('note', 'Note'),
						]),
						validationMode: 'onBlur',
						actions: [changeAction],
					},
				});
				await userEvent.click(getByRole(host, 'textbox', { name: /^Name/ }));
				await userEvent.click(getByRole(host, 'textbox', { name: 'Note' }));
				await expect.poll(() => queryByText(host, 'Name is required') !== null).toBe(true);
				await userEvent.type(getByRole(host, 'textbox', { name: 'Note' }), 'hi');
				await expect.poll(() => lastActionContext()?.formData.note).toBe('hi');
				expect(lastActionContext()?.isValid).toBe(false);
				expect(lastActionContext()?.metadata.userInteractions).toBeGreaterThan(0);
			});
			test('a field hidden by a constraint does not make checkValidity fail', async () => {
				const { host } = await setup({
					config: {
						...form([
							input('kind', 'Kind'),
							{
								...input('company', 'Company'),
								rules: [{ type: 'required', message: 'Company is required' }],
								constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'show' }],
							},
							{
								$type: 'fieldSet',
								id: 'billing',
								name: 'billing',
								constraints: [{ field: 'kind', operator: 'equals', value: 'business', action: 'show' }],
								elements: [
									{
										...input('vat', 'VAT'),
										rules: [{ type: 'required', message: 'VAT is required' }],
									},
								],
							},
						]),
						actions: [changeAction],
					},
				});
				await userEvent.type(getByRole(host, 'textbox', { name: /^Kind/ }), 'x');
				await expect.poll(() => lastActionContext()?.formData.kind).toBe('x');
				await expect(lastActionContext()?.form.checkValidity()).resolves.toBe(true);
				await userEvent.fill(getByRole(host, 'textbox', { name: /^Kind/ }), 'business');
				await expect.poll(() => lastActionContext()?.formData.kind).toBe('business');
				await expect(lastActionContext()?.form.checkValidity()).resolves.toBe(false);
			});
			test('a validity check answers for its own values while a field check is pending', async () => {
				const fetchStub = stubFetch((value) =>
					value === 'ab' ? { valid: false, message: 'Handle is taken' } : { valid: true },
				);
				const requested = () =>
					fetchStub.mock.calls.map(
						([, init]) =>
							(JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as { value: unknown }).value,
					);
				const { host } = await setup({
					config: {
						...form([
							{
								...input('handle', 'Handle'),
								rules: [
									{ type: 'async', url: '/conformance-check', debounce: 300, disableCache: true },
								],
							},
						]),
						validationMode: 'onChange',
						reValidateMode: 'onChange',
						actions: [changeAction],
					},
				});
				const handle = getByRole(host, 'textbox', { name: 'Handle' });
				await userEvent.type(handle, 'a');
				await expect.poll(() => lastActionContext()?.formData.handle).toBe('a');
				const check = lastActionContext()!.form.checkValidity();
				await userEvent.type(handle, 'b');
				await expect(check).resolves.toBe(true);
				expect(requested()).toContain('a');
				await expect.poll(() => queryByText(host, 'Handle is taken') !== null).toBe(true);
				expect(requested()).toContain('ab');
			});
		});
		test('typing over a debounced async check shows only the latest result', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ valid: false, message: 'Handle is taken' }))),
			);
			const { host } = await setup({
				config: {
					...form([
						{
							...input('handle', 'Handle'),
							rules: [{ type: 'async', url: '/conformance-check', debounce: 50, disableCache: true }],
						},
					]),
					reValidateMode: 'onChange',
				},
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			const shown: string[] = [];
			const observer = new MutationObserver(() => shown.push(host.textContent ?? ''));
			observer.observe(host, { subtree: true, childList: true, characterData: true });
			try {
				await userEvent.type(getByRole(host, 'textbox', { name: 'Handle' }), 'ada');
				await expect.poll(() => queryByText(host, 'Handle is taken') !== null).toBe(true);
				expect(shown.some((text) => text.includes('Validation pending'))).toBe(false);
			} finally {
				observer.disconnect();
				vi.unstubAllGlobals();
			}
		});
		test('an aborting submit action runs error and complete triggers without success', async () => {
			const onSubmit = vi.fn();
			const onAction = vi.fn();
			const { host } = await setup({
				config: {
					...form([input('fullName', 'Name')]),
					actions: [
						{ $type: 'conformance', id: 'abort', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'skipped', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'success', triggers: ['form_submit_success'] },
						{ $type: 'conformance', id: 'error', triggers: ['form_submit_error'] },
						{ $type: 'conformance', id: 'complete', triggers: ['form_submit_complete'] },
					],
				},
				onSubmit,
				onAction,
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(actionIds).toEqual(['abort', 'error', 'complete']);
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onAction).not.toHaveBeenCalled();
		});
		describe('submission', () => {
			const lifecycleActions = [
				{ $type: 'conformance', id: 'success', triggers: ['form_submit_success'] },
				{ $type: 'conformance', id: 'error', triggers: ['form_submit_error'] },
				{ $type: 'conformance', id: 'complete', triggers: ['form_submit_complete'] },
			];
			test('a second submit while one is pending is ignored', async () => {
				let finish!: () => void;
				const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
				const { host } = await setup({
					config: { ...form([input('fullName', 'Name')]), actions: lifecycleActions },
					onSubmit,
				});
				const element = host.querySelector('form')!;
				element.requestSubmit();
				element.requestSubmit();
				await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
				await new Promise((resolve) => setTimeout(resolve, 100));
				expect(onSubmit).toHaveBeenCalledTimes(1);
				finish();
				await expect.poll(actionIds).toEqual(['success', 'complete']);
			});
			test('a rejected onSubmit is a failed submission', async () => {
				const onSubmit = vi.fn(() => Promise.reject(new Error('Save failed')));
				const { host } = await setup({
					config: { ...form([input('fullName', 'Name')]), actions: lifecycleActions },
					onSubmit,
				});
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(actionIds).toEqual(['error', 'complete']);
				expect(onSubmit).toHaveBeenCalledTimes(1);
			});
			test('a failing lifecycle completes once', async () => {
				const { host } = await setup({
					config: {
						...form([input('fullName', 'Name')]),
						actions: [
							{ $type: 'conformance', id: 'success', triggers: ['form_submit_success'] },
							{ $type: 'conformance', id: 'reject-dispatch', triggers: ['form_submit_complete'] },
						],
					},
				});
				await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
				await expect.poll(actionIds).toEqual(['success', 'reject-dispatch']);
				await new Promise((resolve) => setTimeout(resolve, 100));
				expect(actionIds().filter((id) => id === 'reject-dispatch')).toHaveLength(1);
			});
		});
		test('an action callback rejection aborts submission and later submit actions', async () => {
			const onSubmit = vi.fn();
			const onAction = vi.fn(() => {
				throw new Error('Callback stopped submission');
			});
			const { host } = await setup({
				config: {
					...form([input('fullName', 'Name')]),
					actions: [
						{ $type: 'conformance', id: 'first', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'skipped', triggers: ['form_submit'] },
						{ $type: 'conformance', id: 'success', triggers: ['form_submit_success'] },
						{ $type: 'conformance', id: 'error', triggers: ['form_submit_error'] },
						{ $type: 'conformance', id: 'complete', triggers: ['form_submit_complete'] },
					],
				},
				onSubmit,
				onAction,
			});
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(actionIds).toEqual(['first', 'error', 'complete']);
			expect(onSubmit).not.toHaveBeenCalled();
			expect(onAction).toHaveBeenCalledTimes(1);
		});
		test('runs a Valibot action registration and forwards change and action callbacks', async () => {
			const onChange = vi.fn();
			const onAction = vi.fn();
			const { host } = await setup({
				config: {
					...form([input('fullName', 'Name')]),
					actions: [{ $type: 'conformance', id: 'changed', triggers: ['form_submit'] }],
				},
				onChange,
				onAction,
			});
			await userEvent.fill(getByRole(host, 'textbox', { name: 'Name' }), 'Ada');
			await expect.poll(() => onChange.mock.calls.length).toBeGreaterThan(0);
			await userEvent.click(getByRole(host, 'button', { name: /submit/i }));
			await expect.poll(() => onAction.mock.calls.length).toBe(1);
			expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'changed' }), { fullName: 'Ada' });
			expect(onChange).toHaveBeenLastCalledWith({ fullName: 'Ada' });
		});
		describe('built-in recipes', () => {
			test('every built-in spec has a conformance case', () => {
				expect(recipeCases).toHaveLength(Object.keys(builtInRecipeSpecs).length);
				expect(recipeCases.map((recipe) => recipe.$type).sort()).toEqual(
					Object.values(builtInRecipeSpecs)
						.map((spec) => spec.$type)
						.sort(),
				);
			});

			test.each(recipeCases.map((recipe) => [recipe.$type, recipe] as const))(
				'%s renders every declared slot with the authored labels',
				async (_name, recipe) => {
					const { host } = await setup({ config: recipeForm(recipe) });
					const wizardKind = recipe.steps > 1;

					if (recipe.header) {
						expect(getByRole(host, 'heading', { level: 1, name: 'Profile' })).toBeTruthy();
						expect(getByRole(host, 'heading', { level: 1 }).parentElement?.getAttribute('data-align')).toBe(
							'center',
						);
						expect(queryByText(host, `Section 1 of ${recipe.steps}`)).not.toBeNull();
					} else {
						expect(queryAllByRole(host, 'heading', { name: 'Profile' })).toHaveLength(0);
						expect(queryByText(host, /^Section \d+ of/)).toBeNull();
					}

					if (recipe.progress === 'indicators') {
						const active = activeIndicator(host);
						expect(active).toHaveLength(1);
						expect(active[0].textContent).toContain('Profile');
					} else {
						expect(queryByRole(host, 'navigation')).toBeNull();
					}
					if (recipe.progress === 'minimal') {
						const bar = getByRole(host, 'progressbar', { name: 'Application progress' });
						expect(bar.getAttribute('aria-valuenow')).toBe('33');
						expect(bar.getAttribute('aria-valuetext')).toBe('Stage 1 of 3');
					} else {
						expect(queryByRole(host, 'progressbar')).toBeNull();
					}

					if (wizardKind) {
						const previous = getByRole(host, 'button', { name: 'Back one step' });
						expect(previous.textContent).toBe('Back');
						expect(previous.hasAttribute('disabled')).toBe(true);
						expect(getByRole(host, 'button', { name: 'Continue to next step' }).textContent).toBe(
							'Continue',
						);
						expect(queryByText(host, 'Page 1 of 3')).not.toBeNull();
						expect(queryByRole(host, 'button', { name: 'Send application' })).toBeNull();
					} else {
						expect(getByRole(host, 'button', { name: 'Send application' }).textContent).toBe('Send');
					}

					if (recipe.sideContent) expect(queryByText(host, recipe.sideContent)).not.toBeNull();
					const titleCount = queryAllByText(host, formTitle).length;
					expect(titleCount).toBe(recipe.$type.startsWith('split-screen') ? 1 : 0);
				},
			);

			test.each(
				recipeCases.filter((recipe) => recipe.steps > 1).map((recipe) => [recipe.$type, recipe] as const),
			)('%s marks the active step and moves progress when Next is activated', async (_name, recipe) => {
				const { host } = await setup({ config: recipeForm(recipe) });
				await userEvent.click(getByRole(host, 'button', { name: 'Continue to next step' }));
				await expect.poll(() => queryByText(host, 'Page 2 of 3') !== null).toBe(true);
				expect(queryByText(host, 'Section 2 of 3') !== null).toBe(recipe.header);
				if (recipe.header) expect(getByRole(host, 'heading', { level: 1, name: 'Plan' })).toBeTruthy();
				if (recipe.progress === 'indicators') {
					const active = activeIndicator(host);
					expect(active).toHaveLength(1);
					expect(active[0].textContent).toContain('Plan');
					const first = within(getByRole(host, 'navigation', { name: 'Application progress' })).getAllByRole(
						'button',
					)[0];
					expect(first.hasAttribute('aria-current')).toBe(false);
					expect(first.textContent).toContain('Done');
				}
				if (recipe.progress === 'minimal') {
					const bar = getByRole(host, 'progressbar', { name: 'Application progress' });
					expect(bar.getAttribute('aria-valuenow')).toBe('67');
					expect(bar.getAttribute('aria-valuetext')).toBe('Stage 2 of 3');
				}
				await userEvent.click(getByRole(host, 'button', { name: 'Continue to next step' }));
				await expect.poll(() => queryByRole(host, 'button', { name: 'Send application' }) !== null).toBe(true);
				expect(queryByRole(host, 'button', { name: 'Continue to next step' })).toBeNull();
				expect(getByRole(host, 'button', { name: 'Send application' }).textContent).toBe('Send');
			});
		});
	});
}
