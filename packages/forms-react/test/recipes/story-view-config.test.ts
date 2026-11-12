import { describe, expect, test } from 'vitest';
import { validateRegistrationConfig } from '@schema-engine/forms/lib/standard-schema';
import {
	CardRecipe,
	CardWizardRecipe,
	SplitScreenRecipe,
	WizardRecipe,
} from '@/components/schema-engine/forms/recipes/registrations';

describe('recipe view schemas accept partial slot config', () => {
	test('card with shell only', () => {
		expect(() =>
			validateRegistrationConfig(CardRecipe.schema, {
				$type: 'card',
				shell: { maxWidth: 'md', padding: 'md' },
			}),
		).not.toThrow();
	});

	test('split-screen with shell only', () => {
		expect(() =>
			validateRegistrationConfig(SplitScreenRecipe.schema, {
				$type: 'split-screen',
				shell: { sideContent: 'Welcome', sidePlacement: 'left' },
			}),
		).not.toThrow();
	});

	test('card-wizard with shell only', () => {
		expect(() =>
			validateRegistrationConfig(CardWizardRecipe.schema, {
				$type: 'card-wizard',
				shell: { maxWidth: 'md', padding: 'md' },
			}),
		).not.toThrow();
	});

	test('wizard with progress only', () => {
		expect(() =>
			validateRegistrationConfig(WizardRecipe.schema, {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true },
			}),
		).not.toThrow();
	});

	test('rejects $type inside shell config', () => {
		expect(() =>
			validateRegistrationConfig(CardRecipe.schema, {
				$type: 'card',
				// @ts-expect-error -- slot config rejects $type at compile time too
				shell: { $type: 'card', maxWidth: 'md' },
			}),
		).toThrow();
	});
});
