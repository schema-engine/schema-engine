---
'@schema-engine/forms': patch
---

Each step in the runtime snapshot, and so in `FormWizard`, carries its `title` from the step config, so a stepper reads `step.title` instead of looking it up by id in its own copy of the config. A step of a validated form config always has one; `title` is optional in the type only because `FormRuntimeStep`, which a hand-built runtime config uses, does not require it.
