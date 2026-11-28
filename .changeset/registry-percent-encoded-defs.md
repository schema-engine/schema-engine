---
'@schema-engine/registry': patch
---

`JSONSchemaEmbedder.embedDefinition` reads a `$ref` whose fragment percent-encodes the definitions keyword (`#/%24defs/title`) as the keyword, as RFC 6901 section 6 requires, so it points at the lifted definition (`#/$defs/text.title`) instead of dangling at `#/$defs/text/%24defs/title`.
