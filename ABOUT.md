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
- "Each team brings its own vocabulary; the engine keeps the rules the same."
- "Forms is the first domain."

Avoid:

- "A new standard", "the standard for forms", or similar claims.
- Leading with "schema" or "validation".
- Describing blocks or page contents before they are designed.
