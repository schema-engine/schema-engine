---
'@schema-engine/forms': minor
---

Add the `relate` cross-field validation rule

One rule covers the comparisons that would otherwise be eight registrations:
password confirmation, date ordering, "at least one of these", mutual
exclusion, and all-or-none. It lists field references and names an assertion
over the resulting values.

```ts
{ type: 'relate', fields: ['password'], assert: 'allEqual', message: 'Passwords must match' }
```

References resolve relative to the declaring field, so a rule authored once
inside an array reads its own row. The declaring field's own value participates
first unless `includeSelf` is off; `as` sets the comparison basis (`auto`,
`string`, `number`, `date`, `boolean`); `skipWhenIncomplete` keeps a half-filled
group quiet, and is ignored by `atLeastOne`, `exactlyOne` and `allOrNone`, whose
whole job is to fire on one.

`ValidationPresets.relate` adds `matches`, `after`, `before`, `atLeastOneOf`,
`mutuallyExclusive` and `allOrNone`, each returning a plain rule object so
TypeScript authoring and JSON round-tripping produce the same configuration.

Cross-field rules are not revalidated when a field they read changes; that is
tracked separately.
