import { describe, expect, test } from 'vitest';
import { safeParseStandardSchema } from '@schema-engine/registry';
import {
	CardRecipe,
	CardWizardRecipe,
	SplitScreenRecipe,
	WizardRecipe,
} from '@/components/schema-engine/forms/recipes/registrations';

describe('recipe view schemas accept partial slot config', () => {
	test('card with shell only', () => {
		expect(
			safeParseStandardSchema(CardRecipe.schema, {
				$type: 'card',
				shell: { appearance: { size: 'default' } },
			}),
		).toMatchObject({ success: true });
	});

	test('split-screen with shell only', () => {
		expect(
			safeParseStandardSchema(SplitScreenRecipe.schema, {
				$type: 'split-screen',
				shell: { sideContent: 'Welcome', sidePlacement: 'left' },
			}),
		).toMatchObject({ success: true });
	});

	test('card-wizard with shell only', () => {
		expect(
			safeParseStandardSchema(CardWizardRecipe.schema, {
				$type: 'card-wizard',
				shell: { appearance: { size: 'default' } },
			}),
		).toMatchObject({ success: true });
	});

	test('wizard with progress only', () => {
		expect(
			safeParseStandardSchema(WizardRecipe.schema, {
				$type: 'wizard',
				progress: { showStepNumbers: true, showStepTitles: true },
			}),
		).toMatchObject({ success: true });
	});

	test('rejects $type inside shell config', () => {
		expect(
			safeParseStandardSchema(CardRecipe.schema, {
				$type: 'card',
				// @ts-expect-error -- slot config rejects $type at compile time too
				shell: { $type: 'card', appearance: { size: 'default' } },
			}),
		).toMatchObject({ success: false });
	});
});
