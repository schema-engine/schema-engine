---
'@schema-engine/forms-react': minor
---

Reset React Hook Form state when `FormRenderer` receives a new normalized config, resolve constraints from each rendered field path, and only emit form changes for field value updates. Direct callers of `useConstraintLogic` must pass the rendered field path first: change `useConstraintLogic(constraints, baseRequired, fieldPath?)` to `useConstraintLogic(fieldPath, constraints, baseRequired)`, for example `useConstraintLogic(name, constraints, false)`.
