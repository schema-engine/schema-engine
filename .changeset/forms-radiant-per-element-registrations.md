---
'@schema-engine/forms-radiant': minor
---

Each registration from `@schema-engine/forms-radiant/registrations` loads only its own element, so an engine built from a few registrations no longer bundles the other widgets. Importing `InputElementRegistration` alone leaves out the phone, masked and drop-zone inputs and the `libphonenumber-js` and `imask` libraries behind them.

Each registration module spreads its default element contract into `defineInput` (`defineStatic` for the submit button and the submission alert) beside its Radiant component, as the registry items of forms-react do. `sideEffects` names only the modules that have a load-time effect (the custom elements, the Radiant UI imports, `dist/index.js` and the stylesheets), and `dist` holds one file per source module instead of hashed chunks, so a bundler can drop every widget you do not name.

`radiantElements` is removed from `@schema-engine/forms-radiant/registrations`. Use `schemaFormRegistrations` from the package root for every element, or the named registrations for some.

```diff
- import { radiantElements } from '@schema-engine/forms-radiant/registrations';
- const engine = createRadiantFormEngine({ elements: radiantElements.all() });
+ import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
+ const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
```

```ts
import { createRadiantFormEngine } from '@schema-engine/forms-radiant';
import { InputElementRegistration, SelectElementRegistration } from '@schema-engine/forms-radiant/registrations';

const engine = createRadiantFormEngine({ elements: [InputElementRegistration, SelectElementRegistration] });
```

Each `radiantElements` call maps onto the named registrations or the array:

| 0.5                            | 0.6                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `radiantElements.all()`        | `schemaFormRegistrations`                                                     |
| `radiantElements.get('input')` | `InputElementRegistration`                                                    |
| `radiantElements.get(type)`    | `schemaFormRegistrations.find((registration) => registration.$type === type)` |
| `radiantElements.has(type)`    | `schemaFormRegistrations.some((registration) => registration.$type === type)` |
| `radiantElements.keys()`       | `schemaFormRegistrations.map((registration) => registration.$type)`           |
