import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { builtInAxes } from '@schema-engine/layout';
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { acmeForm } from './config';

const css = readFileSync(new URL('./acme-theme.css', import.meta.url), 'utf8');
const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
const [size, surface] = builtInAxes;

describe('the Acme theme', () => {
	test('is a valid form in the Radiant engine', () => {
		expect(engine.safeValidateForm(acmeForm)).toMatchObject({ success: true });
	});

	test('picks values of two axes that exist, and sets the tokens those values read', () => {
		expect(Object.keys(size.values)).toContain('comfortable');
		expect(Object.keys(surface.values)).toContain('outlined');
		expect(css).toContain("[data-se-size='comfortable']");
		expect(css).toContain("[data-se-surface='outlined']");
		const comfortable = Object.values(size.values.comfortable).join(' ');
		for (const hook of ['--se-space-comfortable', '--se-control-height-comfortable']) {
			expect(css, hook).toContain(`${hook}:`);
			expect(comfortable, hook).toContain(`var(${hook},`);
		}
	});

	test('is styled by the class the config puts on the form, and no other', () => {
		expect(acmeForm.className).toBe('acme');
		expect(css.match(/^\.[\w-]+/gm)).toEqual(['.acme', '.acme', '.acme']);
	});
});
