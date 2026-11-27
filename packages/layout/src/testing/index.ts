/**
 * @schema-engine/layout/testing
 *
 * Checks for a renderer's DOM tests. They read a DOM, so this entry needs the DOM types (`lib: ["DOM"]`);
 * the main entry has none, so a server that only compiles a theme needs no DOM lib.
 */

export { findSubgridChainBreaks } from './subgrid-chain';
