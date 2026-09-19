---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': minor
---

Move constraint path resolution and evaluation into `@schema-engine/forms/constraints`, and fix the Radiant defects the duplication was hiding.

`resolveConstraintPath`, `resolveConstraintPaths`, `evaluateConstraints` and `evaluateResolvedConstraints` are new exports. A constraint names a sibling, so the path it resolves to depends on where the declaring field is rendered — inside `contacts.0.email`, `accountType` means `contacts.0.accountType`. That rule had been copied verbatim into both renderer packages and had started to drift; it now lives once, beside the evaluator that consumes it. `ConstraintEvaluator` still works and is deprecated in favour of the functions.

Fixed in `@schema-engine/forms-radiant`:

- Constraints on fields inside `arrayElements` never toggled. Visibility was applied by building CSS selectors from the config, which only knows the authored template path (`contacts.email`), while the renderer emits one composed path per row (`contacts.0.email`), so nothing matched. The sync now reads the rendered `data-se-constraint-field` values and maps each back to its declaring element, and evaluates each row against its own siblings.
- `action: 'disable'` was computed and discarded. It is now applied to the field it wraps. `action: 'require'` is still evaluated but not applied — see the audit's `needs-review/`.
- A wizard step whose fields live inside a fieldset or an array validated only the container's own name, so `Next` advanced past required fields that were still empty. Step validation now walks the element tree and expands array templates against live values.

**Behaviour change for `@schema-engine/forms-react`:** a one-element array now compares as its element, so `{ operator: 'equals', value: 'sports' }` matches a single-selection checkbox group holding `['sports']` instead of silently failing. Radiant already behaved this way; the two renderers disagreed on the same config, and this is the shared rule.
