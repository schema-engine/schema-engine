---
'@schema-engine/layout': patch
---

Add `findSubgridChainBreaks(root)`, a DOM check for a renderer's tests that returns one sentence per break in a subgrid's chain to its grid (a box without `GRID_SUBGRID_CLASS`, a subgrid without `data-se-theme`, a subgrid with no grid above it), so a wrapper that silently drops the subgrid's tracks fails `expect(findSubgridChainBreaks(container)).toEqual([])`.
