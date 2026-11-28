import { describe, expect, test } from 'vitest';
import { parseRegistration } from '../utils/parse-registration';
import {
	CardRecipe,
	CardWizardRecipe,
	SplitScreenRecipe,
	WizardRecipe,
} from '@/components/schema-engine/forms/recipes/registrations';

describe('recipe view schemas accept partial slot config', () => {
	test('card with shell only', () => {
		expect(() =>
			parseRegistration(CardRecipe.schema, {
				$type: 'card',
				shell: { appearance: { size: 'default' } },
			}),
		).not.toThrow();
	});

	test('split-screen with shell only', () => {
		expect(() =>
			parseRegistration(SplitScreenRecipe.schema, {
				$type: 'split-screen',
				shell: { sideContent: 'Welcome', sidePlacement: 'left' },
			}),
		).not.toThrow();
	});

	test('card-wizard with shell only', () => {
		expect(() =>
			parseRegistration(CardWizardRecipe.schema, {
				$type: 'card-wizard',
				shell: { appearance: { size: 'default' } },
			}),
		).not.toThrow();
	});

	test('wizard with progress only', () => {
		expect(() =>
			parseRegistration(WizardRecipe.schema, {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true },
			}),
		).not.toThrow();
	});

	test('rejects $type inside shell config', () => {
		expect(() =>
			parseRegistration(CardRecipe.schema, {
				$type: 'card',
				// @ts-expect-error -- slot config rejects $type at compile time too
				shell: { $type: 'card', appearance: { size: 'default' } },
			}),
		).toThrow();
	});
});
