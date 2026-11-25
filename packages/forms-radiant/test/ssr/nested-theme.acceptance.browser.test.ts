import { describe, inject, test } from 'vitest';
import {
	expectAuthorClassOutranksNestedTokens,
	expectAuthorClassOutranksTokensOnThemeRoot,
	expectFormNestedInItsOwnThemeUsesItsTokens,
	expectNestedFormUsesOwnThemeTokens,
	expectNestedGuestIgnoresHostSlots,
	expectNestedFormUsesOwnThemeTokensWithoutScope,
	expectOuterPickReachesUnpickedGuest,
	expectPlainWrapperKeepsThemeTokens,
	expectReenteredThemeFallsBackWithoutScope,
	expectReenteredThemeUsesOwnTokens,
} from '../../../../test-utils/nested-theme-acceptance';
import { nestedHostTheme } from '../../../../test-utils/nested-theme-fixtures';

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

	test('does not read the host item placement at a width its own breakpoints have not reached', async () => {
		await expectNestedGuestIgnoresHostSlots(
			inject('ssrNestedThemeHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});

	test('uses its own tokens when it sits in a grid item of its own theme', async () => {
		await expectFormNestedInItsOwnThemeUsesItsTokens(inject('ssrNestedThemeHtml'), inject('ssrNestedTheme'));
	});

	test('reaches a pick through plain wrappers below the theme root', async () => {
		await expectPlainWrapperKeepsThemeTokens(nestedHostTheme, inject('ssrNestedTheme'));
	});

	test('inherits an outer host pick when it picks nothing itself', async () => {
		await expectOuterPickReachesUnpickedGuest(
			inject('ssrNestedThemeUnpickedHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});

	test('keeps an author class on the element that carries the theme and the pick above the tokens', async () => {
		await expectAuthorClassOutranksTokensOnThemeRoot(
			inject('ssrNestedThemeFormClassHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});

	test('falls back to the form pick below another theme without @scope, as documented', async () => {
		await expectReenteredThemeFallsBackWithoutScope(
			inject('ssrReenteredThemeHtml'),
			nestedHostTheme,
			inject('ssrNestedTheme'),
		);
	});
});
