/**
 * Shared browser assertions for the control height the built-in `size` axis stands for.
 *
 * @remarks
 * `size: compact` and `size: comfortable` set the semantic token `--se-control-height`, and each
 * renderer maps it onto its own controls. The form is authored once here and measured the same way
 * in both renderers, so the two acceptance tests cannot drift apart. Each renderer passes the heights
 * its own theme gives, because the renderer-neutral hooks are fallbacks a theme replaces.
 */
import { getByRole } from '@testing-library/dom';
import { afterEach, describe, expect, test } from 'vitest';
import type { FormConfigView } from '@schema-engine/forms';
import type { ConformanceMount } from './renderer-conformance';

/** Heights, in CSS pixels, of the text input and the submit button of {@link controlHeightForm}. */
export interface ControlHeights {
	input: number;
	button: number;
}

/** What a renderer's theme gives each pick. */
export interface ExpectedControlHeights {
	/** The heights with no pick. Omitted when the renderer's controls have no theme height. */
	unpicked?: ControlHeights;
	compact: ControlHeights;
	comfortable: ControlHeights;
}

/**
 * A one-step form with a text input and a submit button, picking `size` on the form and optionally on the step.
 *
 * @remarks The step pick is how a nested `default` undoes the `compact` form around it.
 */
export function controlHeightForm(size?: string, stepSize?: string): FormConfigView {
	return {
		id: 'control-height',
		appearance: size ? { size } : undefined,
		steps: [
			{
				id: 'main',
				title: 'Main',
				appearance: stepSize ? { size: stepSize } : undefined,
				elements: [
					{ $type: 'input', id: 'email', name: 'email', label: 'Email' },
					{ $type: 'submit', id: 'submit', name: 'controlHeightSubmit', label: 'Send' },
				],
			},
		],
	};
}

/** Measures the border box of the input and the button, so a content-box control is not read short. */
export function readControlHeights(host: HTMLElement): ControlHeights {
	return {
		input: getByRole(host, 'textbox', { name: 'Email' }).getBoundingClientRect().height,
		button: getByRole(host, 'button', { name: 'Send' }).getBoundingClientRect().height,
	};
}

/**
 * Registers the control height scenarios of #282 for a renderer.
 *
 * @param mount The renderer's mount, as the conformance suite uses it.
 * @param expected The heights the renderer's theme gives `compact` and `comfortable`, and no pick when it has one.
 * @remarks
 * `size: default` hands the token back, so it must equal no pick, also inside a `compact` form.
 */
export function controlHeightAcceptance(mount: ConformanceMount, expected: ExpectedControlHeights): void {
	describe('control height follows the size axis', () => {
		let cleanup: (() => void) | undefined;
		afterEach(() => {
			cleanup?.();
			cleanup = undefined;
		});
		const heights = async (size?: string, stepSize?: string) => {
			const result = await mount({ config: controlHeightForm(size, stepSize) });
			cleanup = result.cleanup;
			return readControlHeights(result.host);
		};
		const unpickedHeights = async () => {
			const unpicked = await heights();
			cleanup?.();
			cleanup = undefined;
			return unpicked;
		};

		test('no pick keeps the height the theme gives its controls', async () => {
			const unpicked = await heights();
			if (expected.unpicked) expect(unpicked).toEqual(expected.unpicked);
			expect(unpicked).not.toEqual(expected.compact);
			expect(unpicked).not.toEqual(expected.comfortable);
		});

		test('compact gives inputs and buttons the compact control height', async () => {
			expect(await heights('compact')).toEqual(expected.compact);
		});

		test('comfortable gives inputs and buttons the comfortable control height', async () => {
			expect(await heights('comfortable')).toEqual(expected.comfortable);
		});

		test('default looks like no pick', async () => {
			const unpicked = await unpickedHeights();
			expect(await heights('default')).toEqual(unpicked);
		});

		test('default on a step undoes the compact form around it', async () => {
			const unpicked = await unpickedHeights();
			expect(await heights('compact', 'default')).toEqual(unpicked);
		});
	});
}

/**
 * Registers the scenario that an author's size hook on an ancestor reaches a pick in a renderer.
 *
 * @param mount The renderer's mount, as the conformance suite uses it.
 * @remarks
 * The hooks (`--se-control-height-compact` and `--se-control-height-comfortable`) are the one documented way
 * to retune the size axis, and the rule is the same in every renderer: set them on `:root` or any ancestor. The
 * values are far from every theme value the renderers map, so a hook that is replaced shows as the wrong number.
 * A pick the hook does not name keeps its height: no pick is the theme's own.
 */
export function controlHeightHookAcceptance(mount: ConformanceMount): void {
	const hooks = { '--se-control-height-compact': '18px', '--se-control-height-comfortable': '52px' };
	describe.each([
		['the root element', () => document.documentElement],
		['the body', () => document.body],
	])('a size hook set on %s', (_label, ancestor) => {
		let cleanup: (() => void) | undefined;
		afterEach(() => {
			cleanup?.();
			cleanup = undefined;
			for (const name of Object.keys(hooks)) ancestor().style.removeProperty(name);
		});
		const heights = async (size?: string) => {
			const result = await mount({ config: controlHeightForm(size) });
			cleanup = result.cleanup;
			return readControlHeights(result.host);
		};

		test('reaches a compact and a comfortable pick', async () => {
			for (const [name, value] of Object.entries(hooks)) ancestor().style.setProperty(name, value);
			expect(await heights('compact')).toEqual({ input: 18, button: 18 });
			cleanup?.();
			cleanup = undefined;
			expect(await heights('comfortable')).toEqual({ input: 52, button: 52 });
		});

		test('leaves no pick and default on the height the theme gives', async () => {
			const unpicked = await heights();
			cleanup?.();
			cleanup = undefined;
			for (const [name, value] of Object.entries(hooks)) ancestor().style.setProperty(name, value);
			expect(await heights()).toEqual(unpicked);
			cleanup?.();
			cleanup = undefined;
			expect(await heights('default')).toEqual(unpicked);
		});
	});
}
