import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { createLayoutTheme } from '@/lib/layout-theme';

/**
 * Radiant emits the theme stylesheet once per form, so its size is paid per form. The budgets sit a
 * few percent above the current output: a change that grows the default stylesheet past them must
 * say so here, with the reason, rather than land unnoticed.
 *
 * Before the cascade was written once per property the default stylesheet was 16578 bytes raw and
 * 1550 gzipped. The size hooks then grew a `--se-host-*` fallback each (about 200 raw bytes, #311), so an
 * author's hook on `:root` outranks the value a renderer maps from its host theme.
 */
const RAW_BUDGET_BYTES = 11_000;
const GZIP_BUDGET_BYTES = 1_600;

describe('the default theme stylesheet size', () => {
	const css = createLayoutTheme().css;

	test('stays within the raw budget', () => {
		expect(Buffer.byteLength(css)).toBeLessThanOrEqual(RAW_BUDGET_BYTES);
	});

	test('stays within the gzip budget', () => {
		expect(gzipSync(Buffer.from(css), { level: 9 }).length).toBeLessThanOrEqual(GZIP_BUDGET_BYTES);
	});
});
