/**
 * @schema-engine/layout
 *
 * Domain-neutral layout for Schema Engine. `createLayoutTheme` compiles a grid vocabulary and
 * appearance axes into one theme with one id, one stylesheet and one `data-se-theme`
 * attribute; the grid schemas, named placement and pure appearance helpers sit beside it. Knows
 * nothing about forms, so any container of items can use it.
 */

export * from './schemas/appearance';
export * from './schemas/grid';
export * from './lib/appearance';
export * from './lib/deep-readonly';
export * from './lib/grid-placement';
export * from './lib/grid-styles';
export * from './lib/layout-theme';
export * from './recipes/bind-recipe';
export * from './recipes/define-recipe-spec';
export * from './recipes/merge-slot-defaults';
export * from './recipes/protocol';
export * from './recipes/resolve-recipe-view';
export * from './recipes/types';
export * from './recipes/view-model';
