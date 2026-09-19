import { describe, test } from 'vitest';
import { expectSsrGridAcceptance } from '../../../../test-utils/ssr-grid-acceptance';
import { getSsrAcceptanceEngine, renderSsrLayoutAcceptanceHtml } from './render-form-ssr-html';

describe('SSR grid layout acceptance', () => {
	test('responsive layout at two widths without application JavaScript', async () => {
		await expectSsrGridAcceptance(renderSsrLayoutAcceptanceHtml(), getSsrAcceptanceEngine().getCompiledGrid());
	});
});
