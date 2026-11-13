import { describe, test } from 'vitest';
import {
	expectNeutralHooksPaired,
	expectSsrAreasMarkup,
	expectSsrGridMarkup,
} from '../../../../test-utils/ssr-grid-acceptance';
import { renderArraySsrAcceptanceHtml } from './render-form-array-ssr-html';
import { renderSsrNestedWidthsAcceptanceHtml } from './render-nested-widths-ssr-html';
import {
	getSsrAcceptanceEngine,
	renderSsrAreasAcceptanceHtml,
	renderSsrLayoutAcceptanceHtml,
} from './render-form-ssr-html';

describe('SSR grid layout markup', () => {
	test('the renderer emits the stylesheet, the grid container, and sparse field variables', () => {
		expectSsrGridMarkup(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getLayout());
	});

	test('a drawn layout travels as the template on the grid and the area on each field', () => {
		expectSsrAreasMarkup(renderSsrAreasAcceptanceHtml());
	});

	test('a fieldset and an array row keep the neutral hooks beside the form ones', () => {
		expectNeutralHooksPaired(renderSsrNestedWidthsAcceptanceHtml());
		expectNeutralHooksPaired(renderArraySsrAcceptanceHtml());
	});
});
