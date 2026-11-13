import { describe, inject, test } from 'vitest';
import {
	expectAuthorClassOutranksNestedTokens,
	expectNestedFormUsesOwnThemeTokens,
	expectNestedFormUsesOwnThemeTokensWithoutScope,
	expectReenteredThemeUsesOwnTokens,
	nestedHostTheme,
} from '../../../../test-utils/nested-theme-acceptance';

describe('a form nested in another theme grid', () => {
	test('uses its own theme tokens whichever stylesheet comes later', async () => {
		await expectNestedFormUsesOwnThemeTokens(
			inject('ssrNestedThemeHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});

	test('uses its own theme tokens from the plain rules alone, as a browser without @scope does', async () => {
		await expectNestedFormUsesOwnThemeTokensWithoutScope(
			inject('ssrNestedThemeHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});

	test('uses its own theme tokens when its theme is re-entered below another theme', async () => {
		await expectReenteredThemeUsesOwnTokens(
			inject('ssrReenteredThemeHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});

	test('keeps an author class above the axis tokens of both themes', async () => {
		await expectAuthorClassOutranksNestedTokens(
			inject('ssrNestedThemeAuthorHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});
});
