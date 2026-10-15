---
'@schema-engine/forms': minor
'@schema-engine/forms-react': minor
'@schema-engine/forms-radiant': minor
---

Infer element, recipe, action, and normalized form config types from each engine's registrations. Remove global FormEngine registry augmentation so engines with different element sets remain independent. Consumers augmenting the global namespace should register schemas on their engine instead.

Keep engine selection on `FormEngineProvider` and `FormRenderer`; `FormProvider` consumes the engine from its context.
