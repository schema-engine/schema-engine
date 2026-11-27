import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { createLayoutTheme } from '@/lib/layout-theme';

/**
 * Radiant emits the theme stylesheet once per form, so its size is paid per form. The budgets sit a
 * few percent above the current output: a change that grows the default stylesheet past them must
 * say so here, with the reason, rather than land unnoticed.
 *
 * Before the cascade was written once per property the default stylesheet was 16578 bytes raw and
 * 1550 gzipped. The size hooks then grew a `--se-renderer-*` fallback each (324 raw bytes, 25 gzipped, #311), so an
 * author's hook on `:root` outranks the value a renderer maps from its theme. The grid rule then reset
 * `--se-item-display-mode` (31 raw bytes), so a fieldset's own `grid` mode stops leaking into its fields. The sizes are
 * measured at the longest theme id (8 characters), so the headroom of the raw budget, 6 bytes, is a fixed ceiling and not
 * slack that a shorter id leaves.
 *
 * The three `se-subgrid` rules then added 357 raw bytes. They are emitted in every theme, because a
 * stylesheet cannot know which documents will set `grid.subgrid`, and each is needed: the box rule makes a box a
 * column subgrid on its parent's gap, the child rule spans what is not an item, and the grid rule takes the parent's
 * template, gap and default column over the grid's own resets.
 *
 * Numeric spans then added 621 raw bytes and 78 gzipped (F6). The grid rule gained one row of the property table, the
 * track count its items clamp a `span` to: a declared custom property over the five breakpoint gates, one gate and
 * one reset per breakpoint, and in a container theme one more gate reset. The `grid-auto-flow` line and the subgrid's
 * `inherit` are the rest. Each is emitted in every theme, because a stylesheet cannot know which documents will set
 * `span` or `autoFlow`, and the row cannot be dropped: the count must follow the template through the same gates, or
 * the clamp would switch at a different width than the tracks do.
 */
const RAW_BUDGET_BYTES = 12_135;
const GZIP_BUDGET_BYTES = 1_765;

describe('the default theme stylesheet size', () => {
	const css = createLayoutTheme().css;

	test('stays within the raw budget', () => {
		expect(Buffer.byteLength(css)).toBeLessThanOrEqual(RAW_BUDGET_BYTES);
	});

	test('stays within the gzip budget', () => {
		expect(gzipSync(Buffer.from(css), { level: 9 }).length).toBeLessThanOrEqual(GZIP_BUDGET_BYTES);
	});
});
