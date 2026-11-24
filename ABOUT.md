# About Schema Engine

How to describe Schema Engine in the README, the docs app,
talks and presentations. Technical vocabulary lives in [CONTEXT.md](./CONTEXT.md);
this file covers what the project is and how to talk about it.

## Name

**Schema Engine** is the umbrella for every domain: `@schema-engine/forms` today,
with `@schema-engine/blocks`, `@schema-engine/page` and others planned. The name is
settled. The project owns the `schema-engine` GitHub org and the `@schema-engine`
npm scope.

Do not name it for one domain. Forms is the first domain, not the product.

## Lead with what it does, not with "schema"

In the TypeScript ecosystem "schema" reads as validation (Zod, Valibot, JSON
Schema validators), and "Schema Engine" also names Prisma's migration engine.
Open with the outcome: declarative, portable interfaces that each team extends
with its own components and actions. Mention schemas as the mechanism, after that.

## The message: a common language

Lead with this, in this order, in the project's voice. It is the owner's reason for the project, and it is true of the code.

1. **A common language.** Schema Engine describes an interface or a process as data that any renderer reads the same way. It is a small set of rules that anyone can use to describe their own interface, not a component kit.
2. **Ownership.** The person who builds with it owns the result: their inputs, their decorative elements, their design system. It does not bend to a library or a framework.
3. **The registry.** A collection of registrations that follow the same rules: a `$type`, a schema for the configuration and metadata. It is not limited to forms.
4. **Actions as serializable workflows.** An action is defined once in code. Its entries are plain data, so an async workflow is a JSON array that can be stored, sent and replayed, and `parseActions` checks it before anything runs.
5. **Rendering from serialized data.** A server can send a document to a client, the client checks it against the registrations, and a renderer draws it.

Write "we" or the product's name, never "I". Forms is the first domain: the example that shows the rest, not the whole.

## The layers

| Layer                | What it is                                                                                                            | Who owns it                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Core                 | The shared grammar: `$type` dispatch, the registration contract, constraints, actions and triggers, recipes and slots | Schema Engine                          |
| Domain               | Forms, blocks, page. Each declares its own recipe protocol (slots, kinds, rules) with `defineRecipeProtocol`          | Schema Engine                          |
| Vocabulary           | The components and actions a team registers inside a domain, typically its design system                              | Each developer or company              |
| Reference vocabulary | The built-in classic components (input, select, checkbox, ...): a starting point to copy and change, not a contract   | Schema Engine, freely changed by users |

The extensibility is the point. Every team builds its own vocabulary, and the
core keeps those vocabularies working the same way: they resolve, validate,
compose and dispatch by the same rules.

Working terms: "vocabulary" and "reference vocabulary" are not final.
"Form primitives" is a candidate for the forms reference vocabulary. Avoid
borrowing JSON Schema's "dialect" and "core vocabulary" terms;
`@json-schema-engine/*` already uses them for a validator.

## Standards stance

- Schema Engine is **not** a standard and does not call itself one.
- It **uses** [Standard Schema](https://standardschema.dev/) at the registration
  boundary: any provider (Zod, Valibot, Effect Schema, hand-written) can validate
  a registration.
- A standard of components is not the goal: users are expected to change them.
  If anything becomes a specification later, it is the core grammar.
- The path is adoption first, specification after. The model is Swagger becoming
  OpenAPI, not a spec written up front. The prerequisites: a serializable
  document format versioned separately from the runtime, a published JSON Schema
  for it, a conformance suite written as data fixtures, and at least one
  implementation outside this repository.

## Phrases

Use:

- "Declarative interfaces, extended with your own components and actions."
- "A common language for describing an interface or a process as data."
- "A workflow is a JSON array: store it, send it, replay it."
- "Each team brings its own vocabulary; the engine keeps the rules the same."
- "Forms is the first domain."
- "Forms are configured, not coded: the engine owns the form state, so there are no form library adapters."

Avoid:

- "A new standard", "the standard for forms", or similar claims.
- Leading with "schema" or "validation".
- "Plugin" for an action, and a bare "registry" where the shadcn registry could be meant: say "action", "registry" for the code and "shadcn registry" for the copied React source.
- "Form Engine" as the product name: the product is Schema Engine, and Forms is its first domain.
- Describing blocks or page contents before they are designed.
