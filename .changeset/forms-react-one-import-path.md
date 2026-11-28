---
'@schema-engine/forms-react': minor
---

Each export has one import path: `@schema-engine/forms-react/hooks` no longer re-exports what `@schema-engine/forms` declares, the names `@schema-engine/forms-react/contexts` re-exported come from `@schema-engine/forms/recipes` (the entry itself is removed), and `SubmissionState` and `ViewContextValue`, which renamed two of those, are gone.

| Before (from `@schema-engine/forms-react/hooks`)                                                                                   | After                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `FORM_ROOT`                                                                                                                        | `FORM_ROOT` from `@schema-engine/forms/state-container`    |
| `FieldArrayValue`, `FormIssueFormatter`, `FormStateError`, `FormStateErrorsInput`, `FormStateIssue`, `FormSubmissionIssue` (types) | the same names from `@schema-engine/forms/state-container` |
| `FormValues`, `FormSubmitHelpers`, `SubmissionStatus` (types)                                                                      | the same names from `@schema-engine/forms`                 |
| `SubmissionState` (type)                                                                                                           | `FormSubmissionState` from `@schema-engine/forms`          |

| Before (from `@schema-engine/forms-react/contexts`) | After                                              |
| --------------------------------------------------- | -------------------------------------------------- |
| `ViewContextValue` (type)                           | `ViewModel` from `@schema-engine/forms/recipes`    |
| `ViewNavigation`, `ViewStep` (types)                | the same names from `@schema-engine/forms/recipes` |

The hooks stay on `@schema-engine/forms-react/hooks`, and `ViewProvider` is on `@schema-engine/forms-react/primitives`. A copied shadcn `form-submission-alert.tsx` imports `FORM_ROOT` from `@schema-engine/forms/state-container`: run `shadcn add` for the item again, or change the import by hand.

```ts
// before
import { FORM_ROOT, type FieldArrayValue, type SubmissionState } from '@schema-engine/forms-react/hooks';
// after
import { FORM_ROOT, type FieldArrayValue } from '@schema-engine/forms/state-container';
import type { FormSubmissionState } from '@schema-engine/forms';
```
