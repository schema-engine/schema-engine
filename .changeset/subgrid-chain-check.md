---
'@schema-engine/layout': patch
---

Add `findSubgridChainBreaks(root)`, a DOM check for a renderer's tests that returns every box between a subgrid and its grid that lacks `GRID_SUBGRID_CLASS`, so a wrapper that silently drops the subgrid's tracks fails a test instead.
