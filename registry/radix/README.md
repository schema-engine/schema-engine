# Radix UI registry

Radix UI port of the Schema Engine shadcn form registry.

```sh
pnpm dlx shadcn@latest add schema-engine/schema-engine/schema-form-radix
```

Source: `registry/radix/primitives/` overrides only the combobox (Popover + Command); the phone input, drop zone, and
masked input come from `registry/shared/primitives/`. Form wrappers come from `registry/shared/forms/`.

Use this aggregate when your project is initialized with `pnpm dlx shadcn@latest init -b radix`.
