# Form store (internal)

The contract for a form's state container, and its reference implementation. Neither is exported from a
package entry point: the contract stays internal until both renderer bindings run on it, so what is
published is the smallest contract that works for both.

## Ownership

| Owns                                                          | Does not own                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| The nested value tree                                         | Submission: `handleSubmit`, `isSubmitting`, `submitCount`, guards                 |
| Field state: errors, touched, dirty, keyed by dotted path     | Control registration: a host bridges a control with `setValue`/`blur`/`setErrors` |
| Row ids of field arrays, and moving field state with the rows | Focus and native submit: the host supplies them                                   |
| Atomic updates: one command, one notification                 |                                                                                   |

## Contract

[types.ts](./types.ts) is the contract: `subscribe`, a stable immutable `getSnapshot`, a stable
`getServerSnapshot` and the commands `getValue`, `setValue`, `blur`, `reset`, `validate`,
`checkValidity`, `setErrors`, `fieldArray` and `adoptRowIds`. Rules a store must keep:

- Unchanged branches keep their references. Opaque values, such as an array of `File` objects, are never
  copied, frozen or diffed, and are compared by reference.
- `setValue` replaces the whole branch.
- Where several sources set an error for a path, the source set most recently wins and the store's own
  `validation` source loses to all of them. Editing a path drops the explicit-source errors at and below it.
- A failed `validate` starts re-validation by `reValidateMode` for the paths it covered. It marks nothing
  submitted, so a failed wizard step does not surface errors of later steps. The state ends only with
  `reset`, or when a branch write removes the rows it covered. `checkValidity` is silent. An empty list of
  paths validates nothing; omitting the list validates the form.
- An async result is applied path by path, and dropped for a path when that path's value was written
  while it ran, a value the path's rules read changed, a validation that started later asked for the same
  path, rows of an array around it moved (only that array), or the form was reset. An explicit `validate`
  that lost part of its result runs once more and resolves with the validity of the current state.
- A row operation validates the array's own rules, not its rows, and `reset` gives every row a new id.
- Writing a branch drops the field state of rows and objects it removed, so a row added later at the same
  index starts clean.
- A command notifies subscribers once, including when it starts a validation.

The rules are tests: `formStoreConformance(createStore)` in [test-utils/form-store-conformance.ts](../../../../test-utils/form-store-conformance.ts)
registers them with vitest, like the renderer conformance suite. `test/store/form-store-rules.test.ts`
points each rule at a store written to break it.

## Reference store

`createFormStore(options)` implements the contract with no framework. Validation goes through
`validateFormValues`, with one debounce scope for recorded validation and one for `checkValidity`; dependents of a changed value are found with
`buildDependencyIndex` by comparing the values at every watched path, so a write to a parent such as
`address` re-validates a rule that reads `address.country`. Values are null-prototype maps inside and
frozen plain records in the snapshot. The dependency index is cached per store and rebuilt only when
the row count of any array, nested ones included, changes; typing, moving rows and adopting ids do not
rebuild it.
