# Schema Engine — context

## Zod and Standard Schema boundary

This monorepo uses a **hybrid model** pre-v1:

| Layer | Role |
|-------|------|
| `registry` / `actions` | `StandardSchemaV1` on every `BaseRegistration.schema` |
| `forms` | Zod for authoring; `asStandardSchema()` at registration sites; `~standard.validate` at runtime |
| `forms-react` | Zod in `*.types.ts` for built-in field config authoring; **zod is a peerDependency** |

### Rules

1. **Author** field/action config schemas with Zod (or another library) inside package-internal `*.types.ts`.
2. **Register** with `asStandardSchema(schema)` or a native `StandardSchemaV1` implementation.
3. **Validate** via `~standard.validate` / `safeParseStandardSchema` at engine and action boundaries.
4. **Consumers** may register custom elements with a hand-written Standard Schema — they are not required to install Zod unless they use Zod-authored built-ins.

### Proof test

`packages/forms-react/test/schemas/standard-schema-fixture.test.ts` validates a minimal non-Zod Standard Schema through the forms bridge.
