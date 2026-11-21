# Form state container (internal)

The contract for a form's state container, and its reference implementation. Neither is exported from a
package entry point: the contract stays internal until both renderer bindings run on it, so what is
published is the smallest contract that works for both.

It is called a container, not a store, because `FormStore` is a class of Radiant UI; the engine's interface
is `FormStateContainer`, its factory `createFormStateContainer` and its snapshot `FormStateSnapshot`.

## Ownership

| Owns                                               | Does not own                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| The nested value tree and the defaults             | Submission: `handleSubmit`, `isSubmitting`, `submitCount`, guards                 |
| Field state: errors, touched, dirty, failed checks | Control registration: a host bridges a control with `setValue`/`blur`/`setErrors` |
| Row ids of field arrays                            | Focus and native submit: the host supplies them                                   |
| Atomic updates: one command, one notification      |                                                                                   |

## Paths and field state

A path is a plain dotted path with the row index in it (`contacts.1.email`) everywhere in the API. The form
itself is `FORM_PATH` (`''`), where an error about the form rather than a field is kept.

Internally, errors per source, touched marks, dirty marks and failed checks are trees with one node per
value (`state-tree.ts`): a node holds the state of its own path in `self` and the state below it in
`children`, an array with one element per row where the value is an array and a map where it is an object.
The kind of children is decided by the shape of the value, not by how a path segment is spelled.

- A row operation is one splice of `children`, applied to the values and to every tree in the same commit,
  so a row's state travels with it by construction. There is no re-keying and no pruning afterwards.
- `setValue` conforms each tree to the written branch: rows past the end of an array and branches that are
  no longer containers lose their state.
- Row ids (`row-ids.ts`) are a tree of the same shape. They give a row an identity: a field array renders by
  `snapshot.rowIds[path]`, a server render is adopted with the `rowIds` option, and a late validation
  result finds its row by id.

Defaults are cloned (the `defaults` option and `reset(values)`): defaults and live values never share objects.

The snapshot shows this as flat maps by exact path: `errors`, `touched` and `dirty`, with `values`,
`defaults`, `rowIds`, `isValidating` and `isValid`.

- **Errors are never inherited.** `errors['contacts']` is the array's own error and `errors['contacts.0.email']`
  the row's; both can be present. The error of a field is the entry for exactly its path.
- **Touched covers.** A mark on a container covers the fields below it.
- **Dirty** marks the paths whose value differs from the defaults. An array's own mark means its row count
  changed; rows are compared index by index, so appending a row does not make the rows before it dirty.
- **Sources.** Errors come from `native` (the platform's own control validity), the container's own
  `validation` and `server`, in that order of precedence, whatever order they were set in. A host sets
  `native` and `server` with `setErrors(source, errors)`; an empty map clears the source.
- **Editing clears what a host set.** `setValue` drops the `native` and `server` errors at the path, below
  it and on the paths around it, the form's own included, as the value they described changed.

## Contract

[types.ts](./types.ts) is the contract: `subscribe`, a stable immutable `getSnapshot`, a stable
`getServerSnapshot` and the commands `getValue`, `getFieldState`, `setValue`, `blur`, `reset`, `validate`,
`checkValidity`, `setErrors` and `fieldArray`. No member depends on how it is called.

Reads are pure selectors over the snapshot, memoized per snapshot and path, so they are safe as selectors
for `useSyncExternalStore` or an external store source: `selectFieldState`, `selectValue` and `selectError` in
[selectors.ts](./selectors.ts), and `selectFields(rowIds)` and `toFieldArrayValue(rowIds, commands)` in
[field-array.ts](./field-array.ts), which builds the React Hook Form style `FieldArrayValue` both bindings
hand to their widgets. `fieldArray(path)` returns the same commands object for a path each time.

### Naming, after React Hook Form

| Here                               | React Hook Form          | Difference                                                                                             |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `selectFieldState(snapshot, path)` | `getFieldState`          | The same `{ error, invalid, isTouched, isDirty }`; an error is never inherited, touched covers below   |
| `setErrors(source, errors)`        | `setError`/`clearErrors` | One call per source; an empty map clears the source. Sources are typed and have a fixed precedence     |
| `validate(paths?)`                 | `trigger`                | Resolves `false` while any source still has an error at the paths; `checkValidity` is the silent one   |
| `fieldArray(path)` and `rowIds`    | `useFieldArray`          | The same operations and `fields` with stable ids; falsy rows are kept, and row state travels with rows |
| `subscribe` and selectors          | `watch`/`useWatch`       | The reader names what it reads through a pure selector; no proxy tracking                              |
| `reset(values?)`                   | `reset`                  | Default values are copied, never aliased with the live values                                          |

### Rules a container must keep

- Unchanged branches keep their references. Opaque values, such as an array of `File` objects, are never
  copied, frozen or diffed, and are compared by reference.
- `setValue` replaces the whole branch.
- `setErrors` takes errors with an optional `type` and `message`: a missing `type` is stored as the name of
  the source and a missing `message` as an empty string. `validate` resolves `false` while any error, from
  any source, remains at the validated paths, so a server or native error blocks it; `checkValidity` gives
  the same answer without writing, counting the errors a host set.
- A failed `validate` starts re-validation by `reValidateMode` for the paths it covered. It marks nothing
  submitted, so a failed wizard step does not surface errors of later steps. The state ends only with
  `reset`, or when a branch write removes the rows it covered. An empty list of paths validates nothing;
  omitting the list validates the form.
- An async result is applied where its fields are now: each path is found again through the ids of the
  rows it ran through, so a result for a row that moved lands on that row and one for a removed row is
  dropped. It is also dropped for a path when that path's value was written while it ran, a value the
  path's rules read changed, or a validation that started later asked for the same path. A reset drops the
  whole result and nothing is run again. An explicit `validate` that lost part of its result otherwise runs
  once more and resolves with the validity of the current state.
- A row operation validates the array's own rules, not its rows, and `reset` gives every row a new id.
- A command notifies subscribers once, including when it starts a validation.

The rules are tests: `formStoreConformance(createStore)` in [test-utils/form-store-conformance.ts](../../../../test-utils/form-store-conformance.ts)
registers them with vitest, like the renderer conformance suite. `test/store/form-store-rules.test.ts`
points each rule at a container written to break it, and two files mock the run tracker and the row anchors
to show the late-result cases fail without them. `test/store/form-store-interface.test.ts` checks the
container against a local copy of the interface a bridge host needs; it checks the copy, so the host's own
declaration has to match it.

## Reference container

`createFormStateContainer(options)` implements the contract with no framework. Validation goes through
`validateFormValues`, which returns errors by dotted path, with one debounce scope for recorded validation
and one for `checkValidity`; a row operation names the array exactly (`exactNames`), so its rows are not
validated. Dependents of a changed value are found with `buildDependencyIndex` by comparing the values at
every watched path, so a write to a parent such as `address` re-validates a rule that reads `address.country`;
the index keeps each rule's references as authored, and a late result resolves them against the dependent's
path as it was and as it is, so a sibling reference follows its row and an absolute one stays where it is.
The dependency index is cached per container and rebuilt only when the row count of any array, nested ones
included, changes. Values are null-prototype maps inside and frozen plain records in the snapshot.
