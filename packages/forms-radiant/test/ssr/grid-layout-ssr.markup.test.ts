import { describe, test } from 'vitest';
import { expectSsrGridMarkup } from '../../../../test-utils/ssr-grid-acceptance';
import { getSsrAcceptanceEngine, renderSsrLayoutAcceptanceHtml } from './render-form-ssr-html';

describe('SSR grid layout markup', () => {
	test('the renderer emits the stylesheet, the grid container, and sparse field variables', () => {
		expectSsrGridMarkup(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});
});
