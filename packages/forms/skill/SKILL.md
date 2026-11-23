---
name: schema-engine
description: |
    Schema Engine is a JSON-driven, type-safe form system. Use this skill when
    an agent is asked to build, configure, validate, submit or extend a form
    with @schema-engine/forms, @schema-engine/forms-react,
    @schema-engine/forms-radiant, @schema-engine/actions or
    @schema-engine/registry, or to write a form widget for React or Radiant.
---

# Schema Engine

Schema Engine turns a serializable form definition into a working form. One framework-free engine owns validation,
state and submission. A renderer (React or Radiant) only draws the fields and bridges the user's controls into that state.

This file is the router. It defines the core concepts once; the references assume them and never repeat them.
Read a reference only when the task needs it.

## Core concepts

- **config**: a form is plain data, a `FormConfig` of steps holding elements, each with a `$type`, a `name`, `rules` and `constraints`. `engine.defineForm()` (typed, in TypeScript) or `engine.validateForm(unknown)` (portable JSON) checks it against the engine's registrations and returns a frozen `NormalizedFormConfig` that the engine owns.
- **container**: the form's state, a `FormStateContainer` from `@schema-engine/forms/state-container`. It owns the nested values, errors, warnings, touched and dirty marks, field-array row ids and the validation in flight. Paths are dotted (`contacts.1.email`) and `FORM_ROOT` is the form itself. Every change is a command (`setValue`, `blur`, `reportNative`, `validate`, `submit`, `reset`, `fieldArray`), and every read is a pure selector over an immutable snapshot.
- **runtime**: `createFormRuntime` is the lifecycle every renderer shares. It builds the container and owns the submission, the wizard steps and their navigation, `form_mount` and `form_change`, and every action dispatch. A renderer supplies only what an element can do, such as focus.
- **issues and the formatter**: the engine reports what is wrong as an issue (`type`, `source`, `ruleId`, `params`, `message`) and never makes up text. `formatIssue`, a function of the application, turns an issue into the words shown, and falls back to the issue's own `message`.

Outcomes use one vocabulary: a check or a submission ends `passed`, `invalid` or `overtaken`. `overtaken` means an edit or a reset outran the check, so there is no verdict and nothing to show.

## Packages

| Package                        | Role                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `@schema-engine/forms`         | The engine: config, validation, constraints, the container, the runtime. Also `/csrf`, `/server-errors` and `/testing` |
| `@schema-engine/forms-react`   | React renderer: `FormRenderer` and the hooks. Widgets are copied into the app from the shadcn registry                 |
| `@schema-engine/forms-radiant` | Radiant renderer: `se-form-instance`, `FormController`, widgets and recipes in the package                             |
| `@schema-engine/actions`       | Sequential action dispatcher the runtime uses for form triggers                                                        |
| `@schema-engine/registry`      | Read-only registries the engine builds elements, recipes, actions and validations on                                   |

## To do X, read Y

| To do                                                                        | Read                                 |
| ---------------------------------------------------------------------------- | ------------------------------------ |
| Create an engine, author a config, use the container or the runtime directly | `reference/forms.md`                 |
| Render a form in React, or use its hooks                                     | `reference/forms-react.md`           |
| Render a form in Radiant, or reach the container from an element             | `reference/forms-radiant.md`         |
| Write or change a field widget, and test it                                  | `reference/widgets.md`               |
| Add a rule, explain a validation result, or translate messages               | `reference/validation-and-issues.md` |
| Handle submit, server errors, CSRF or wizard steps                           | `reference/submission.md`            |
| Run code on a form event, or define an action                                | `reference/actions.md`               |
| Register elements, recipes, actions or validation rules                      | `reference/registry.md`              |

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
| Examples                       | `/docs/examples/basic-form`        |

This skill ships inside `@schema-engine/forms` as `skill/`, so the guide you read matches the installed version. The deployed site serves the latest one at `/skill/`.
