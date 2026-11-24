# React Aria registry

React Aria port of the Schema Engine shadcn form registry.

```sh
pnpm dlx shadcn@latest add schema-engine/schema-engine/schema-form-aria
```

Source: `registry/aria/primitives/` overrides the combobox, phone input, and drop zone primitives with
`react-aria-components` implementations; the masked input comes from `registry/shared/primitives/`. Form wrappers come
from `registry/shared/forms/`, except the ones in `registry/aria/overlays/forms/`, which bind RAC-style control props
(`isSelected`, `selectedKey`, `minValue`, etc.).

Use this aggregate when your project is initialized with `pnpm dlx shadcn@latest init --base aria`.
