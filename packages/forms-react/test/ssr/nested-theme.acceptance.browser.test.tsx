import { describe, test } from 'vitest';
import {
	expectAuthorClassOutranksNestedTokens,
	expectNestedFormUsesOwnThemeTokens,
	expectReenteredThemeUsesOwnTokens,
	nestedHostTheme,
} from '../../../../test-utils/nested-theme-acceptance';
import { renderNestedThemeGuestHtml, renderReenteredThemeHtml } from './render-form-ssr-html';

describe('a form nested in another theme grid', () => {
	test('uses its own theme tokens whichever stylesheet comes later', async () => {
		const { html, layout } = renderNestedThemeGuestHtml(false);
		await expectNestedFormUsesOwnThemeTokens(html, nestedHostTheme, layout);
	});

	test('uses its own theme tokens when its theme is re-entered below another theme', async () => {
		const { layout } = renderNestedThemeGuestHtml(false);
		await expectReenteredThemeUsesOwnTokens(renderReenteredThemeHtml(), nestedHostTheme, layout);
	});

	test('keeps an author class above the axis tokens of both themes', async () => {
		const { html, layout } = renderNestedThemeGuestHtml(true);
		await expectAuthorClassOutranksNestedTokens(html, nestedHostTheme, layout);
	});
});
