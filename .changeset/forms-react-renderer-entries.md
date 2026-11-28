---
'@schema-engine/forms-react': minor
---

The entries follow the renderer layout shared with forms-radiant: `.`, `/primitives`, `/debugger` and `/debugger.css` mean the same in both, and forms-react adds `/hooks`.

- `FormDebugger` moves from `@schema-engine/forms-react/components/form-debugger` to `@schema-engine/forms-react/debugger`, and its styles from `@schema-engine/forms-react/global.css` to `@schema-engine/forms-react/debugger.css`. `global.css` held only the debugger's styles, so nothing else needs loading. The `style` field of the package is removed with it.
- `ViewProvider` moves from `@schema-engine/forms-react/contexts`, which is removed, to `@schema-engine/forms-react/primitives`.
- `FormEngineContext`, `FormEngineContextValue` and `createFormEngineContextValue` are no longer exported: read the engine with `useFormEngine` or `useOptionalFormEngine` from `@schema-engine/forms-react/hooks`.

```diff
- import { FormDebugger } from '@schema-engine/forms-react/components/form-debugger';
- import '@schema-engine/forms-react/global.css';
+ import { FormDebugger } from '@schema-engine/forms-react/debugger';
+ import '@schema-engine/forms-react/debugger.css';
- import { ViewProvider } from '@schema-engine/forms-react/contexts';
+ import { ViewProvider } from '@schema-engine/forms-react/primitives';
```
