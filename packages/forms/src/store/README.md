# Form store (internal)

The contract for a form's state container, and its reference implementation. Neither is exported from a
package entry point: the contract stays internal until both renderer bindings run on it, so what is
published is the smallest contract that works for both.

## Ownership

| Owns                                               | Does not own                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| The nested value tree                              | Submission: `handleSubmit`, `isSubmitting`, `submitCount`, guards                 |
| Field state: errors, touched, dirty, failed checks | Control registration: a host bridges a control with `setValue`/`blur`/`setErrors` |
| Row ids of field arrays                            | Focus and native submit: the host supplies them                                   |
| Atomic updates: one command, one notification      |                                                                                   |

## Field state has the shape of the values

Errors (one tree per source), touched marks, dirty marks and failed checks are trees like the values: an
object where the value is an object, an array with one element per row where the value is an array
(`state-tree.ts`). A leaf marks a path and covers everything below it: an error on `tags` is the array's
own, and it hides the errors of its rows in the same view.

- A path is a plain dotted path with the row index in it (`contacts.1.email`) everywhere in the API.
- A row operation is one splice, applied to the values and to every tree in the same commit, so a row's
  state travels with it by construction. There is no re-keying and no pruning afterwards.
- `setValue` conforms each tree to the written branch: rows past the end of an array and branches that
  are no longer containers lose their state, and `setErrors` sources lose theirs at and below the path.
- Dirty is derived: the values compared with the defaults, in the shape of the values.
- Row ids (`row-ids.ts`) are a tree of the same shape, holding one id per row and the ids of arrays nested
  in it. They give a row an identity: a field array renders by `fieldArray(path).fields`, a server render
  is adopted with `adoptRowIds`, and a late validation result finds its row by id.

## Contract

[types.ts](./types.ts) is the contract: `subscribe` and `subscribeTo`, a stable immutable `getSnapshot`, a
stable `getServerSnapshot` and the commands `getValue`, `getFieldState`, `setValue`, `blur`, `reset`,
`validate`, `checkValidity`, `setErrors`, `fieldArray` and `adoptRowIds`.

The snapshot holds `values`, the trees `errorTree`, `touched` and `dirty`, `errors` (the flat view of
`errorTree`, path to error, for hosts that look errors up by name), `rowIds` (array path to row ids),
`isValidating` and `checkFailed`. The views are computed once per commit and keep their reference when
unchanged.

### Naming, after React Hook Form

| Here                         | React Hook Form          | Difference                                                                                                |
| ---------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `getFieldState(path)`        | `getFieldState`          | The same `{ error, invalid, isTouched, isDirty }`; an error or touched mark on a container covers it      |
| `setErrors(source, errors)`  | `setError`/`clearErrors` | One call per source; an empty map clears the source. Sources (validation, native, server) are first-class |
| `validate(paths?)`           | `trigger`                | Resolves `false` while any source still has an error at the paths; `checkValidity` is the silent one      |
| `fieldArray(path)`           | `useFieldArray`          | The same operations and `fields` with stable ids; falsy rows are kept, and row state travels with rows    |
| `subscribeTo(selector, ...)` | `watch`/`useWatch`       | The reader names what it reads; no proxy tracking                                                         |
| `reset(values?)`             | `reset`                  | Default values are copied, never aliased with the live values                                             |

### Rules a store must keep

- Unchanged branches keep their references. Opaque values, such as an array of `File` objects, are never
  copied, frozen or diffed, and are compared by reference.
- `setValue` replaces the whole branch.
- Where several sources set an error for a path, the source set most recently wins and the store's own
  `validation` source loses to all of them. Editing a path drops the explicit-source errors at and below it.
- `setErrors` takes errors with an optional `type` and `message`: a missing `type` is stored as the name
  of the source and a missing `message` as an empty string. `validate` resolves `false` while any error,
  from any source, remains at the validated paths, so a server or native error blocks it.
- A failed `validate` starts re-validation by `reValidateMode` for the paths it covered. It marks nothing
  submitted, so a failed wizard step does not surface errors of later steps. The state ends only with
  `reset`, or when a branch write removes the rows it covered. `checkValidity` is silent. An empty list of
  paths validates nothing; omitting the list validates the form.
- An async result is applied where its fields are now: each path is found again through the ids of the
  rows it ran through, so a result for a row that moved lands on that row and one for a removed row is
  dropped. It is also dropped for a path when that path's value was written while it ran, a value the
  path's rules read changed, a validation that started later asked for the same path, or the form was
  reset. An explicit `validate` that lost part of its result runs once more and resolves with the validity
  of the current state.
- A row operation validates the array's own rules, not its rows, and `reset` gives every row a new id.
- A command notifies subscribers once, including when it starts a validation.

The rules are tests: `formStoreConformance(createStore)` in [test-utils/form-store-conformance.ts](../../../../test-utils/form-store-conformance.ts)
registers them with vitest, like the renderer conformance suite. `test/store/form-store-rules.test.ts`
points each rule at a store written to break it, and two files mock the run tracker and the row anchors
to show the late-result cases fail without them.

## Reference store

`createFormStore(options)` implements the contract with no framework. Validation goes through
`validateFormValues`, with one debounce scope for recorded validation and one for `checkValidity`;
dependents of a changed value are found with `buildDependencyIndex` by comparing the values at every
watched path, so a write to a parent such as `address` re-validates a rule that reads `address.country`.
The dependency index is cached per store and rebuilt only when the row count of any array, nested ones
included, changes; typing, moving rows and adopting ids do not rebuild it. Values are null-prototype maps
inside and frozen plain records in the snapshot.
