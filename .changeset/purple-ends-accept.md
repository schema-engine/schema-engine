---
'@schema-engine/forms-radiant': minor
---

Replace disconnected Radiant snapshot hooks and the global active store with a scoped FormController backed by Radiant UI. Support explicit custom-element lifecycle and the optional @formController decorator (TC39 standard and TypeScript experimentalDecorators). Extend RuiField with form access, and connect array components, actions, and the debugger to the same store.

FormController and wrapping hosts read the live store from Radiant UI `formContext` (rc.17+), not a private host field.

This removes useFormContext, useFormField, useWatchField, useWatchForm, useFieldArray, and getActiveFormStore. Use controller reads, watches, field bindings, and fieldArray operations instead. bindControlledFormElement now requires an explicit controller. Defaults and submissions use nested values.
