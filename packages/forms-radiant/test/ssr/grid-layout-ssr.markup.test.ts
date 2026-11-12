import { describe, test } from 'vitest';
import { expectSsrAreasMarkup, expectSsrGridMarkup } from '../../../../test-utils/ssr-grid-acceptance';
import {
	getSsrAcceptanceEngine,
	renderSsrAreasAcceptanceHtml,
	renderSsrLayoutAcceptanceHtml,
} from './render-form-ssr-html';

describe('SSR grid layout markup', () => {
	test('the renderer emits the stylesheet, the grid container, and sparse field variables', () => {
		expectSsrGridMarkup(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});

	test('a drawn layout travels as the template on the grid and the area on each field', () => {
		expectSsrAreasMarkup(renderSsrAreasAcceptanceHtml());
	});
});
