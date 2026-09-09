# Schema Engine — context

## Zod Mini and Standard Schema boundary

The engine uses Zod Mini for its first-party schemas and keeps Standard Schema as the provider-neutral registration boundary:

| Layer                  | Role                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `registry` / `actions` | `StandardSchemaV1` on every `BaseRegistration.schema`                                                   |
| `forms`                | Zod Mini for first-party authoring and JSON Schema export; `~standard.validate` at registration/runtime |
| `forms-react`          | Uses the forms and registry schemas; consumer registrations remain Standard Schema                      |

### Rules

1. **Author** first-party field/action/config schemas with the functional `zod/mini` API. Installing the `zod` package is required to import its `zod/mini` entry point.
2. **Register** the concrete schema. Prefer `defineInput` / `defineStatic` so the render function is checked against schema **output**. Consumer schemas may come from any Standard Schema provider, including Zod, Valibot, and Effect Schema.
3. **Validate** via `~standard.validate` at engine and action boundaries. The forms package wraps the spec call in `safeParseStandardSchema` (`packages/forms/src/lib/standard-schema.ts`; import as `@schema-engine/forms/lib/standard-schema`) for callers that prefer a tagged result over a thrown error.
4. **Consumers** may register custom elements with a hand-written Standard Schema — they are not required to install Zod unless they use Zod-authored built-ins.

Form authors supply schema **input** (defaults stay optional). After `defineForm` / `validateForm`, components receive schema **output**. Nested container `elements` are authored against the same engine registrations as top-level fields.

### Proof test

`packages/forms/test/lib/standard-schema-engine.test.ts` registers a native Standard Schema element, builds a FormEngine, and runs `defineForm`. Renderer packages exercise the same registration through `FormRenderer`.
