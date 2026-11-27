import { describe, expect, inject, test } from 'vitest';
import {
	expectSsrSubgridChainAcceptance,
	expectSsrSubgridColumnsAcceptance,
	expectSsrSubgridContainerAcceptance,
	expectSsrSubgridHiddenAcceptance,
	expectSsrSubgridNestedAcceptance,
	expectSsrSubgridResponsiveAcceptance,
	expectSsrSubgridThroughAcceptance,
	expectSsrSubgridWidthsAcceptance,
	expectSubgridMarkup,
} from '../../../../test-utils/ssr-grid-acceptance';
import { expectSsrSubgridGroupAcceptance } from '../../../../test-utils/accessibility-tree';
import type { SsrSubgridVariant } from '../../../../test-utils/ssr-grid-fixtures';

/** The provided markup escapes `</script>` so it can cross the browser boundary; undo it. */
const html = (variant: SsrSubgridVariant) => {
	const markup = inject('ssrSubgridHtml')[variant];
	expect(markup).toBeTruthy();
	return (markup ?? '').replaceAll('<\\/script>', '</script>');
};

describe('SSR subgrid acceptance', () => {
	test('the item and the inner grid carry the subgrid class, with no query container inside', () => {
		expectSubgridMarkup(html('widths'), false);
	});

	test('a subgrid fieldset is a group named by its legend in the browser accessibility tree', async () => {
		await expectSsrSubgridGroupAcceptance(html('widths'));
	});

	test('fields of a subgrid fieldset line up with the width grid around it', async () => {
		await expectSsrSubgridWidthsAcceptance(html('widths'));
	});

	test('widths that only a subgrid sets give the step twelve tracks', async () => {
		await expectSsrSubgridThroughAcceptance(html('through'));
	});

	test('a subgrid of a columns grid shares its columns and gap, and is inset by its padding on the outer sides', async () => {
		await expectSsrSubgridColumnsAcceptance(html('columns'));
	});

	test('a subgrid follows the responsive tracks of its parent', async () => {
		await expectSsrSubgridResponsiveAcceptance(html('responsive'));
	});

	test('a subgrid fieldset hides from its breakpoint', async () => {
		await expectSsrSubgridHiddenAcceptance(html('hidden'));
	});

	test('every box between a subgrid and its grid carries the subgrid class', async () => {
		await expectSsrSubgridChainAcceptance(html('nested'));
	});

	test('subgrids nest', async () => {
		await expectSsrSubgridNestedAcceptance(html('nested'));
	});

	test('in container mode a subgrid follows its parent container and has no wrapper of its own', async () => {
		await expectSsrSubgridContainerAcceptance(html('container'));
	});
});
