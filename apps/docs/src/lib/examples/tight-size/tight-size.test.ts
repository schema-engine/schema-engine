import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { builtInAxes } from '@schema-engine/layout';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { tightForm } from './config';

const css = readFileSync(new URL('./tight-size.css', import.meta.url), 'utf8');
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });

describe('the tight size', () => {
	test('is a valid form in the Radiant engine', () => {
		expect(engine.safeValidateForm(tightForm)).toMatchObject({ success: true });
	});

	test('overrides the hooks the compact size reads, and the measure it sets', () => {
		const compact = builtInAxes[0].values.compact;
		const read = Object.values(compact).join(' ');
		const hooks = [...css.matchAll(/(--se-[\w-]+-compact):/g)].map((match) => match[1]!);
		expect(hooks.toSorted()).toEqual(['--se-control-height-compact', '--se-space-compact']);
		for (const hook of hooks) expect(read, hook).toContain(`var(${hook},`);
		expect(Object.keys(compact)).toContain('--se-measure');
		expect(css).toContain('--se-measure:');
	});

	test('is styled by the class the config puts on the form, and picks compact on the card shell', () => {
		expect(tightForm.className).toBe('tight-form');
		expect(css.match(/^\.[\w-]+/gm)).toEqual(['.tight-form', '.tight-form']);
		expect(tightForm.view).toMatchObject({ shell: { appearance: { size: 'compact' } } });
	});
});
