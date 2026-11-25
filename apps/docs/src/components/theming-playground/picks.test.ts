import { describe, expect, test } from 'vitest';
import { themedForm } from '@/lib/examples/theming/config';
import { engine as radiantEngine } from '@/lib/examples/theming/theming.radiant';
import { engine as reactEngine } from '@/lib/examples/theming/theming.react';
import {
	applyPicks,
	describePicks,
	getPlaygroundControls,
	PLAYGROUND_AXES,
	readPicks,
	shufflePicks,
	type Picks,
} from './picks';

const picked: Picks = { tone: 'violet', shape: 'pill', font: 'mono', size: 'comfortable', surface: 'flat' };

/** A `random` that returns the given draws in turn, then the last one. */
function sequence(...draws: number[]): () => number {
	let index = 0;
	return () => draws[Math.min(index++, draws.length - 1)]!;
}

describe('the playground controls', () => {
	test('offer every value of the five axes of the theme, in the order of the axes', () => {
		expect(getPlaygroundControls().map(({ axis, values }) => [axis, values])).toEqual([
			['tone', ['neutral', 'brand', 'forest', 'violet', 'ocean']],
			['shape', ['sharp', 'rounded', 'pill']],
			['font', ['sans', 'serif', 'mono']],
			['size', ['compact', 'default', 'comfortable']],
			['surface', ['flat', 'outlined', 'elevated']],
		]);
	});

	test('describe the picks in the order of the axes', () => {
		const picks: Picks = { tone: 'ocean', shape: 'pill', font: 'serif', size: 'comfortable', surface: 'elevated' };
		expect(describePicks(picks)).toBe('Tone ocean, Shape pill, Font serif, Size comfortable, Surface elevated');
	});
});

describe('readPicks', () => {
	test('reads the picks of the config and falls back to the default of an axis it does not pick', () => {
		expect(readPicks(themedForm)).toEqual({
			tone: 'brand',
			shape: 'rounded',
			font: 'sans',
			size: 'compact',
			surface: 'outlined',
		});
	});

	test('reads a value the theme does not list as no pick', () => {
		expect(readPicks({ ...themedForm, appearance: { tone: 'mauve' } }).tone).toBe('neutral');
	});
});

describe('applyPicks', () => {
	test('puts tone, shape and font on the form and size and surface on the card shell', () => {
		const config = applyPicks(themedForm, picked);
		expect(config.appearance).toEqual({ tone: 'violet', shape: 'pill', font: 'mono' });
		expect(config.view).toEqual({
			$type: 'card',
			shell: { appearance: { size: 'comfortable', surface: 'flat' } },
		});
	});

	test('keeps everything the picks do not name and does not change the config it is given', () => {
		const before = JSON.stringify(themedForm);
		const config = applyPicks(themedForm, picked);
		expect(JSON.stringify(themedForm)).toBe(before);
		expect({ ...config, appearance: undefined, view: undefined }).toEqual({
			...themedForm,
			appearance: undefined,
			view: undefined,
		});
	});

	test('reads back as the picks it was given', () => {
		expect(readPicks(applyPicks(themedForm, picked))).toEqual(picked);
	});

	test.each([
		['React', reactEngine],
		['Radiant', radiantEngine],
	])('gives a config every value of every axis may be picked in, in the %s engine', (_renderer, engine) => {
		for (const { axis, values } of getPlaygroundControls()) {
			for (const value of values) {
				const config = applyPicks(themedForm, { ...readPicks(themedForm), [axis]: value });
				expect(engine.safeValidateForm(config), `${axis} ${value}`).toMatchObject({ success: true });
			}
		}
	});
});

describe('shufflePicks', () => {
	test('picks a value of every axis at random', () => {
		const first = shufflePicks(picked, sequence(0));
		const last = shufflePicks(picked, sequence(0.999));
		expect(first).toEqual({ tone: 'neutral', shape: 'sharp', font: 'sans', size: 'compact', surface: 'flat' });
		expect(last).toEqual({ tone: 'ocean', shape: 'pill', font: 'mono', size: 'comfortable', surface: 'elevated' });
	});

	test('moves exactly one axis when the draw repeats the given combination', () => {
		const current: Picks = { tone: 'neutral', shape: 'sharp', font: 'sans', size: 'compact', surface: 'flat' };
		const next = shufflePicks(current, sequence(0));
		expect(PLAYGROUND_AXES.filter(({ axis }) => next[axis] !== current[axis])).toHaveLength(1);
	});

	test('is different from its input over many real draws', () => {
		let current = readPicks(themedForm);
		for (let draw = 0; draw < 200; draw += 1) {
			const next = shufflePicks(current);
			expect(next).not.toEqual(current);
			current = next;
		}
	});
});
