---
name: schema-engine
description: |
    Schema Engine is a common language for declarative interfaces: registrations
    keyed by `$type`, actions that run in sequences, documents that are plain
    data, and rendering from that data. Forms is its first domain. Use this
    skill when an agent is asked to build, configure, validate, submit or extend
    anything with @schema-engine/registry, @schema-engine/actions,
    @schema-engine/layout, @schema-engine/forms, @schema-engine/forms-react or
    @schema-engine/forms-radiant, or to write a form widget for React or Radiant.
---

# Schema Engine

Schema Engine is one grammar for interfaces that are described as data. A team registers the pieces (elements, actions, rules, appearance axes) under a `$type`, and a document, plain JSON or YAML, names them. The engine checks the document against the registrations and the renderer draws what passed. Forms is the first domain: a framework-free engine owns validation, state and submission, and a renderer (React or Radiant) only draws the fields and bridges the user's controls into that state.

This file is the router. It defines the concepts once; the references assume them and never repeat them. Read a reference only when the task needs it.

## Core concepts

- **registration**: `{ $type, schema, metadata, ... }`, where `$type` is the stable key, `schema` is any Standard Schema that describes its config, and `metadata` names it. Elements, recipes, actions, validation rules and appearance axes are all registrations.
- **registry**: a read-only registry, `createRegistry(kind, registrations)` from `@schema-engine/registry`, built once from a list. The last registration of a `$type` wins without a warning, which is how you replace a built-in.
- **document**: serializable data whose every node names a registration by `$type`. It is checked against the registrations at the boundary, so what is rendered or run has passed its schema.
- **action**: a registration with `execute` that runs on a trigger. Actions run as a sequence, an inner array is a parallel group, and a failure that sets `shouldContinue: false` stops what follows and cancels the group's siblings through their `signal`.

## Forms concepts

- **config**: a form is plain data, a `FormConfig` of steps holding elements, each with a `$type`, a `name`, `rules` and `constraints`. `engine.defineForm()` (typed, in TypeScript) or `engine.validateForm(unknown)` (portable JSON) checks it against the engine's registrations and returns a frozen `NormalizedFormConfig` that the engine owns.
- **container**: the form's state, a `FormStateContainer` from `@schema-engine/forms/state-container`. It owns the nested values, errors, warnings, touched and dirty marks, field-array row ids and the validation in flight. Paths are dotted (`contacts.1.email`) and `FORM_ROOT` is the form itself. Every change is a command (`setValue`, `blur`, `reportNative`, `validate`, `submit`, `reset`, `fieldArray`), and every read is a pure selector over an immutable snapshot.
- **runtime**: `createFormRuntime` is the lifecycle every renderer shares. It builds the container and owns the submission, the wizard steps and their navigation, `form_mount` and `form_change`, and every action dispatch. A renderer supplies only what an element can do, such as focus.
- **issues and the formatter**: the engine reports what is wrong as an issue (`type`, `source`, `ruleId`, `params`, `message`) and never makes up text. `formatIssue`, a function of the application, turns an issue into the words shown, and falls back to the issue's own `message`.

Outcomes use one vocabulary: a check or a submission ends `passed`, `invalid` or `overtaken`. `overtaken` means an edit or a reset outran the check, so there is no verdict and nothing to show.

## Packages

| Package                        | Role                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/registry`      | The registration contract and read-only registries every package builds on, and `/yaml` for documents authored as YAML. Ships this router |
| `@schema-engine/actions`       | Actions: `parseActions`, and a dispatcher that runs a sequence with parallel groups, cancellation and results                             |
| `@schema-engine/layout`        | Domain-neutral grid, appearance axes, layout themes and the recipe protocol                                                               |
| `@schema-engine/forms`         | The forms engine: config, validation, constraints, the container, the runtime                                                             |
| `@schema-engine/forms-react`   | React renderer: `FormRenderer` and the hooks. You write the widgets; ready-made ones come from the optional shadcn registry               |
| `@schema-engine/forms-radiant` | Radiant renderer: `se-form-instance`, `FormController`, widgets and recipes in the package                                                |

A symbol has one import path. `@schema-engine/forms` has these entries: `.` (the engine, the runtime and the types), `/state-container` (the container and its selectors), `/csrf`, `/server-errors`, `/recipes`, `/recipes/built-in`, `/browser` (browser-side actions such as auto-save), `/testing` (conformance suites; they need vitest) and `/agent-tool` (experimental).

## To do X, read Y

Each package ships this router as its own `skill/SKILL.md` and its references in its `skill/reference/` folder, so a reference is `node_modules/@schema-engine/<package>/skill/reference/<file>`, and any installed package has the router. Read the rows of the packages the project depends on and skip the others: a package that is not installed has no file. The deployed site serves the latest version of the router and of every reference at `/skill/`, with the references flat at `/skill/reference/<file>`.

| To do                                                                        | Package                        | Reference                            |
| ---------------------------------------------------------------------------- | ------------------------------ | ------------------------------------ |
| Register something, build a registry, or read a YAML document                | `@schema-engine/registry`      | `reference/registry.md`              |
| Parse, dispatch or cancel actions outside a form                             | `@schema-engine/actions`       | `reference/actions.md`               |
| Build a grid, an appearance axis or a layout theme                           | `@schema-engine/layout`        | `reference/layout.md`                |
| Create an engine, author a config, use the container or the runtime directly | `@schema-engine/forms`         | `reference/forms.md`                 |
| Add a rule, explain a validation result, or translate messages               | `@schema-engine/forms`         | `reference/forms-validation.md`      |
| Handle submit, server errors, CSRF or wizard steps                           | `@schema-engine/forms`         | `reference/forms-submission.md`      |
| Run code on a form event, or define a form action                            | `@schema-engine/forms`         | `reference/forms-actions.md`         |
| Render a form in React, or use its hooks                                     | `@schema-engine/forms-react`   | `reference/forms-react.md`           |
| Write or change a React field widget, and test it                            | `@schema-engine/forms-react`   | `reference/forms-react-widgets.md`   |
| Render a form in Radiant, or reach the container from an element             | `@schema-engine/forms-radiant` | `reference/forms-radiant.md`         |
| Write or change a Radiant field widget, and test it                          | `@schema-engine/forms-radiant` | `reference/forms-radiant-widgets.md` |

## Documentation map

The full documentation is at `/docs` on the deployed site. The LLM-exported corpus is `/llms.txt` (index) and `/docs-llm/<section>/<slug>.md` (page bodies).

| Section                        | Path prefix                        |
| ------------------------------ | ---------------------------------- |
| Schema Engine                  | `/docs/schema-engine/introduction` |
| `@schema-engine/registry`      | `/docs/registry/overview`          |
| `@schema-engine/actions`       | `/docs/actions/overview`           |
| `@schema-engine/forms`         | `/docs/forms/overview`             |
| `@schema-engine/forms-react`   | `/docs/forms-react/overview`       |
| `@schema-engine/forms-radiant` | `/docs/forms-radiant/overview`     |
| `@schema-engine/layout`        | `/docs/layout/overview`            |
| Examples                       | `/docs/examples/overview`          |
