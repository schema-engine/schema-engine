---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': minor
---

Re-validate a field when a field its rules read changes

Cross-field rules previously only ran when their own field was validated, so
correcting a password left "passwords must match" on the confirmation until the
user went back to it.

A rule declares what it reads through a new `dependsOn` on its registration —
`relate` returns its `fields`, `async` its `dependencies`. `buildDependencyIndex`
inverts those declarations into a change-to-dependents map over _rendered_
paths, so `lines.0.max` depends on `lines.0.quantity` and not on every row's
quantity. A custom rule that reads other fields should declare `dependsOn` too,
or nothing will re-run it.

`shouldSurfaceDependentError` gates display: a dependent is re-validated once it
has been touched, or once the form has been submitted. Typing a password does
not light up a confirmation nobody has reached. Both renderers call the one
function rather than deciding locally.

Only direct dependents are expanded. If `c` depends on `b` and `b` on `a`,
changing `a` re-validates `b` and not `c` — transitive expansion invites cycles,
and every assertion reads values rather than another field's validity.

`@schema-engine/forms-react` re-validates through `trigger` from a `watch`
subscription rather than widening the resolver's own `options.names`, which
would depend on React Hook Form merging errors for fields it did not ask about.
`@schema-engine/forms-radiant` subscribes through `FormController.watchForm` and
diffs values at the watched paths; that diff is load-bearing, not an
optimisation, because `validateField` writes errors, which notifies, which
re-enters the listener.
