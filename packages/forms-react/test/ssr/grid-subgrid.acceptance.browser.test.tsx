import { describe, test } from 'vitest';
import {
	expectSsrSubgridChainAcceptance,
	expectSsrSubgridColumnsAcceptance,
	expectSsrSubgridContainerAcceptance,
	expectSsrSubgridHiddenAcceptance,
	expectSsrSubgridNestedAcceptance,
	expectSsrSubgridResponsiveAcceptance,
	expectSsrSubgridThroughAcceptance,
	expectSsrSubgridWidthsAcceptance,
} from '../../../../test-utils/ssr-grid-acceptance';
import { expectSsrSubgridGroupAcceptance } from '../../../../test-utils/accessibility-tree';
import { SSR_SUBGRID_VARIANTS } from '../../../../test-utils/ssr-grid-fixtures';
import { renderSsrSubgridHtml } from './render-form-ssr-html';

describe('SSR subgrid acceptance', () => {
	test('a subgrid fieldset is a group named by its legend in the browser accessibility tree', async () => {
		await expectSsrSubgridGroupAcceptance(renderSsrSubgridHtml('widths'));
	});

	test('fields of a subgrid fieldset line up with the width grid around it', async () => {
		await expectSsrSubgridWidthsAcceptance(renderSsrSubgridHtml('widths'));
	});

	test('widths that only a subgrid sets give the step twelve tracks', async () => {
		await expectSsrSubgridThroughAcceptance(renderSsrSubgridHtml('through'));
	});

	test('a subgrid of a columns grid shares its columns and gap, and is inset by its padding on the outer sides', async () => {
		await expectSsrSubgridColumnsAcceptance(renderSsrSubgridHtml('columns'));
	});

	test('a subgrid follows the responsive tracks of its parent', async () => {
		await expectSsrSubgridResponsiveAcceptance(renderSsrSubgridHtml('responsive'));
	});

	test('a subgrid fieldset hides from its breakpoint', async () => {
		await expectSsrSubgridHiddenAcceptance(renderSsrSubgridHtml('hidden'));
	});

	test.each(SSR_SUBGRID_VARIANTS)(
		'every box between a subgrid and its grid carries the subgrid class (%s)',
		async (variant) => {
			await expectSsrSubgridChainAcceptance(renderSsrSubgridHtml(variant));
		},
	);

	test('subgrids nest', async () => {
		await expectSsrSubgridNestedAcceptance(renderSsrSubgridHtml('nested'));
	});

	test('in container mode a subgrid follows its parent container and has no wrapper of its own', async () => {
		await expectSsrSubgridContainerAcceptance(renderSsrSubgridHtml('container'));
	});
});
