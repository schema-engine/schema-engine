# Storybook shadcn UI kit

Styled shadcn components used only by `@schema-engine/forms-react` Storybook. Registry sources import `@/components/ui/*` from the consumer's install; `registry/ui-stubs` covers typechecking and unit tests with bare elements.

Storybook aliases `@/components/ui` here so demos render with the **base-nova** shadcn kit (`components.json` → `style: base-nova`). Reinstall with:

```sh
pnpm dlx shadcn@latest add --overwrite --yes --path .storybook/ui <component>
```

Do not import from this folder in library code.
