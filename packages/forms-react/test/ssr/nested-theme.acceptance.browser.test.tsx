import { describe, test } from 'vitest';
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
import { renderNestedThemeGuestHtml, renderReenteredThemeHtml } from './render-form-ssr-html';

describe('a form nested in another theme grid', () => {
	test('uses its own theme tokens whichever stylesheet comes later', async () => {
		const { html, layout } = renderNestedThemeGuestHtml();
		await expectNestedFormUsesOwnThemeTokens(html, nestedHostTheme, layout);
	});

	test('uses its own theme tokens from the plain rules alone, as a browser without @scope does', async () => {
		const { html, layout } = renderNestedThemeGuestHtml();
		await expectNestedFormUsesOwnThemeTokensWithoutScope(html, nestedHostTheme, layout);
	});

	test('uses its own theme tokens when its theme is re-entered below another theme', async () => {
		const { layout } = renderNestedThemeGuestHtml();
		await expectReenteredThemeUsesOwnTokens(renderReenteredThemeHtml(), nestedHostTheme, layout);
	});

	test('keeps an author class above the axis tokens of both themes', async () => {
		const { html, layout } = renderNestedThemeGuestHtml({ authorClass: 'step' });
		await expectAuthorClassOutranksNestedTokens(html, nestedHostTheme, layout);
	});

	test('does not read the host item placement at a width its own breakpoints have not reached', async () => {
		const { html, layout } = renderNestedThemeGuestHtml();
		await expectNestedGuestIgnoresHostSlots(html, nestedHostTheme, layout);
	});

	test('uses its own tokens when it sits in a grid item of its own theme', async () => {
		const { html, layout } = renderNestedThemeGuestHtml();
		await expectFormNestedInItsOwnThemeUsesItsTokens(html, layout);
	});

	test('reaches a pick through plain wrappers below the theme root', async () => {
		const { layout } = renderNestedThemeGuestHtml();
		await expectPlainWrapperKeepsThemeTokens(nestedHostTheme, layout);
	});

	test('inherits an outer host pick when it picks nothing itself', async () => {
		const { html, layout } = renderNestedThemeGuestHtml({ unpicked: true });
		await expectOuterPickReachesUnpickedGuest(html, nestedHostTheme, layout);
	});

	test('keeps an author class on the element that carries the theme and the pick above the tokens', async () => {
		const { html, layout } = renderNestedThemeGuestHtml({ authorClass: 'form' });
		await expectAuthorClassOutranksTokensOnThemeRoot(html, nestedHostTheme, layout);
	});

	test('falls back to the form pick below another theme without @scope, as documented', async () => {
		const { layout } = renderNestedThemeGuestHtml();
		await expectReenteredThemeFallsBackWithoutScope(renderReenteredThemeHtml(), nestedHostTheme, layout);
	});
});
