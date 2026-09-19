---
'@schema-engine/forms': patch
'@schema-engine/forms-react': minor
---

Declare `@ecopages/logger` as a dependency of `@schema-engine/forms`. It is imported by `lib/logger.ts` and reached from every entry point, but was declared nowhere — the package resolved it only through the hoisted workspace layout, so installing it on its own threw `ERR_MODULE_NOT_FOUND`.

Correct the dependency classification of `@schema-engine/forms-react`, which shipped fifteen runtime dependencies for a package whose source imports five.

- `react` and `react-dom` were listed as both `dependencies` and `peerDependencies`; they are now peers only, so a consumer cannot end up with a second React and an "Invalid hook call".
- `react-hook-form` moves from `dependencies` to `peerDependencies` for the same reason — a duplicate copy makes `useFormContext` return `null`, because RHF context is matched by instance identity. **Consumers now install `react-hook-form` themselves** alongside `react` and `@schema-engine/forms`.
- `cmdk`, `recharts`, `embla-carousel-react`, `react-resizable-panels`, `next-themes` and `sonner` are used only by this repository's Storybook, and `lucide-react` and `react-day-picker` only by the shadcn registry sources (which declare them per item in their own `registry.json`, so registry consumers are unaffected). All eight move to `devDependencies` and are no longer installed by consumers of the package.
- `@hookform/resolvers` is removed; nothing imports it, since the package ships its own resolver.

Also fixes the class list on the unregistered-element error box, where `flexgap-2` was a single class that does not exist instead of `flex gap-2`.
