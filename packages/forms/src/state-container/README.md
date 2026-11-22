# Form state container (internal)

The contract for a form's state container, and its reference implementation. Neither is exported from a
package entry point: the contract stays internal until both renderer bindings run on it, so what is
published is the smallest contract that works for both.

It is called a container, not a store, because `FormStore` is a class of Radiant UI; the engine's interface
is `FormStateContainer`, its factory `createFormStateContainer` and its snapshot `FormStateSnapshot`.

## Ownership

| Owns                                                           | Does not own                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The nested value tree and the defaults                         | Submission: `handleSubmit`, `isSubmitting`, `submitCount`, guards                                                         |
| Field state: errors, warnings, touched, dirty, pending, checks | Control registration: a host bridges a control with `setValue`/`blur` and reports its native validity with `reportNative` |
| Native facts, tied to the value they describe                  | Focus and native submit: the host supplies them                                                                           |
| Row ids of field arrays                                        | Operational status (a service that is down): the runtime's (#336)                                                         |
| Which paths take part in validation                            |                                                                                                                           |
| Atomic updates: one command, one notification                  |                                                                                                                           |

## Paths and field state

A path is a plain dotted path with the row index in it (`contacts.1.email`) everywhere in the API. The form
itself is `FORM_ROOT` (`'__root__'`), where an error about the form rather than a field is kept. Path segments that start with `__`, and `constructor` and `prototype`, are reserved: a field name with one is rejected when a form config is validated, and the container rejects such paths except `FORM_ROOT`. A write (`setValue`, `blur`) and `setServerErrors` also reject a path that names a row its array does not have, so a write cannot leave holes or rows without an id: rows are made with `fieldArray`. Validation modes are `onSubmit`, `onChange`, `onBlur`, `onTouched` (the first blur, then every change, as in React Hook Form) and `all`.

Internally, what the container's checks recorded, server errors, native facts, touched, validated and failed
marks and pending marks are trees with one node per value (`state-tree.ts`): a node holds the state of its
own path in `self` and the state below it in `children`, an array with one element per row where the value is
an array and a map where it is an object. The kind of children is decided by the shape of the value, not by
how a path segment is spelled.

- A row operation is one splice of `children`, applied to the values and to every tree in the same commit,
  so a row's state travels with it by construction. There is no re-keying and no pruning afterwards.
- `setValue` conforms each tree to the written branch: rows past the end of an array and branches that are
  no longer containers lose their state.
- Row ids (`row-ids.ts`) are a tree of the same shape. They give a row an identity: a field array renders by
  `snapshot.rowIds[path]`, a server render is adopted with the `rowIds` option, and a late validation
  result or a late server answer finds its row by id.

Defaults are cloned (the `defaults` option and `reset(values)`): defaults and live values never share objects.

The snapshot shows this as flat maps by exact path: `errors`, `warnings`, `touched`, `dirty` and `validating`,
with `values`, `rowIds` and `isValid`. That is all of it: the defaults are what `reset` restores, and a rule that
could not run is logged or rejected, never kept in the snapshot.

- **Errors are never inherited.** `errors['contacts']` is the array's own error and `errors['contacts.0.email']`
  the row's; both can be present. The error of a field is the entry for exactly its path.
- **An error is an issue with every issue of its path.** Every issue is `{ type, source, ruleId?, params?,
message? }`: `type` is the rule type (`'minLength'`), the `ValidityState` flag of a native control
  (`'typeMismatch'`) or the server's code; `ruleId` is the author's stable id of the rule, so two `pattern`
  rules stay apart; `params` is serializable and is what a translation interpolates (`{ minLength: 8 }`, for a rule
  and for a native control alike, named like the constraint); `message` is only the text the author wrote
  on the rule, or the server or control sent, and may be absent: the schema library's generic text is never used. `errors[path]`
  is the issue to show with `all`, the full, never empty list: what the server said, then each rule the value
  fails in authored order (whatever order the checks finished in), then what the platform's control reports.
  The shown fields equal `all[0]`, and the same object comes back while none of it changes. A rule reports
  one issue however many checks its schema runs. Each validation registration declares the `params` of
  its rule (`params(rule)`): `minLength`, `maxLength`, `min`, `max`, `minItems`, `maxItems` and `pattern`
  give the constraint under its native name, and `async` and `relate` give nothing, so no url, header or field
  list reaches a snapshot, an action context or a formatter.
- **Text is the host's.** `FormIssueFormatter = (issue, { path }) => string` is the one seam: a binding takes
  one from its host, calls it for the issue to show and for each issue of `all`, and falls back to
  `issue.message`. The action context carries the same `FormStateError`. The formatter also takes a
  `FormSubmissionIssue`, `{ type, source: 'submission', params?, message? }`, for a failure of a submission as a
  whole; the snapshot never holds one.
- **Warnings** have exactly that shape and timing, from rules declared `severity: 'warning'`. They never
  affect `isValid`, `validate` or `checkValidity`, and a path that takes no part has none. A server cannot
  send them yet: that is future work, with no change to the shape.
- **Pending is state.** `validating[path]` lists the paths a check is running for, and it moves with its
  row. A path stays pending only while the latest check that asked for it runs: a check a later check took
  over does not keep it spinning.
- **Touched covers.** A mark on a container covers the fields below it.
- **Dirty** marks the paths whose value differs from the defaults. An array's own mark means its row count
  changed; rows are compared index by index, so appending a row does not make the rows before it dirty.
- **`isValid`** is cheap: no error is recorded right now for a path that takes part. It does not prove the
  form is valid (nothing may have been checked) and does not say whether a retry is allowed. A submit button
  should not be disabled by it: a server error makes it `false`, and only the next attempt clears that.

## Freshness

Every check, whether `validate`, `checkValidity` or one the container starts after a change, records the
scope it covers when it starts: the values it reads, the values its rules depend on (from the dependency
index), the native facts, the exclusions, the reset generation and the rows it names, by row id.

- A result is applied, and `validate()` resolves `true`, only if that scope is still current when it
  finishes. Each path is checked on its own: its value, its native fact, the values its rules read and the
  checks that asked for it after.
- An overtaken `validate()` runs once more over the same rows, wherever they are by then: the retry keeps
  the original row anchors and never reads an index again. If the retry is overtaken too, or a row it was
  asked about is gone, it resolves `false`, and nothing stale is written. A reset overtakes everything and
  resolves `false` without a retry.
- `checkValidity()` answers for the values, native facts, server errors and exclusions current when it was
  called, and for no later state. It is never retried, and it never mixes those with errors set after. Its
  answer may be out of date when it resolves.
- **How a submission ended.** `submit()` resolves `{ outcome: 'passed', values, setServerErrors }`, `{ outcome: 'invalid' }`
  (the scope was current and an error blocks: show the errors and focus) or `{ outcome: 'overtaken' }` (an
  edit, a row move, a reset, a later submission or a superseded check outran it: no verdict, ask again and show
  nothing the user did not cause). A call that rejects, with a `FormValidationFailure`, is no outcome.
- **What a submission is.** `submit()` clears the server's answer to the last submission, then validates the whole
  form as `validate()` does, with the same freshness and the same single retry over the same rows. `values` are
  exactly the values that passed, frozen, from the run that resolved: an edit during the check followed by a
  retry that passes leaves the edit. No version number is compared and no token is handed out.

## Native facts

A native fact is what a platform control reports (`{ type, params?, message? }`: the `ValidityState` flag,
the constraint behind it, the control's own text). A host reports it with `reportNative(facts)`, the one
channel for it: a record by path, `null` for a control that reports itself valid or goes away. A single
path is a record of one. Nothing else carries a fact: not `setValue`, not `blur`, and not `validate`,
`checkValidity` or `submit`, which count the facts held.

- A fact binds to the value held now and is stored with it, in the same shaped trees as the rest, so it moves
  with its row. Once the value at its path changes it is dropped, so a write, a programmatic `setValue` too,
  never reuses an old one: a host reports again after it writes a control.
- A fact is an input to validation, not an error. When a check runs for a path, by mode, by a failed check or
  explicitly, its result is the failed rules followed by the fact, so native validity has exactly the timing
  of rules. `validate` and `checkValidity` count the facts of the paths in scope.
- Reporting is no change: nothing becomes dirty or touched, and facts alone never notify, as they are not in the
  snapshot. One call is one commit. It re-validates, in one run, only the paths whose fact changed that were
  validated before, are in a failed scope or have a check in flight, never to start validating a pristine path.
  A fact identical to the one held is a no-op.
- A path the container does not hold (a removed row, an absent object) is ignored. A reserved path throws for
  the whole call, before any fact is written.
- A fact stays held until its control withdraws it with `null`, which a host does when the control disconnects.
  A control that is not reporting is not assumed gone. `reset` clears every fact.

## Participation

One rule decides which paths take part, from the config and the current values: `resolveExcludedPaths`
in `engine/value-validation.ts`, which uses `evaluateConstraints`. A field a `show` or `hide` constraint
hides, and a field that is disabled, whether authored (`disabled`) or by a constraint (`disable`, `enable`),
is excluded together with everything below it. An inactive wizard step is not excluded: it is not rendered.

- No rule runs for an excluded path, and nothing recorded for it counts: not a rule error, native fact or
  server error, not for `validate`, `checkValidity` or `isValid`, and not in `errors`, `warnings` or
  `validating`. Pending work for it is dropped.
- The container recomputes the exclusions when the values change. A path that becomes excluded loses what
  the checks recorded for it. A path that takes part again is re-validated when it was checked before (its
  check failed, or a recorded check decided it) and otherwise waits for its normal timing.
- The rule is the engine's, not the container's: `validateFormValues` applies it too.

## Server errors

A host sets `server` errors, which describe the response to one submission, with the `setServerErrors` of the
`'passed'` result of `submit()`.

- `submit()` clears the server's answer to the last submission and captures the submitted values and rows. A
  later `submit()`, and `reset`, supersede it.
- `setServerErrors(errors)` resolves index paths through the submission's rows: an error for the submitted
  `contacts.0.email` lands on that row wherever it is now, and is dropped when the row is gone. It is applied
  only if its target, and the values its path's rules read (from the dependency index), are as they were
  when the submission was captured; a form-level error needs every value unchanged. Once the submission is
  superseded, or a reset came between, the call does nothing. The map replaces the whole answer: one call is one
  complete answer, and `{}` clears it. Paths are checked first: a reserved path (except `FORM_ROOT`) or a row
  the submitted values did not have throws.
- An error is cleared when its path, a path below it, a path around it (the form included) or a
  value its rules read is edited, because what it described changed.
- A path takes one issue or a list, each `{ type?, params?, message? }`; a missing `type` is `'server'`.
  An issue with only a type still blocks.
- A service that is down is not a field error. It belongs to runtime status (#336); the container has
  nothing for it.

## Validator failures

A rule that cannot run is no field error: it says nothing about the value.

- An invalid rule is rejected when the form config is validated: `ValidationRegistry.check(rule)` finds a
  type with no handler or a handler that throws, so nothing is skipped silently. `createSchema` throws a
  `ValidationRuleError` for the same.
- A rule that throws while it runs is a `FormValidationFailure` naming the path and the rule, with `reason`
  (`'unavailable'`: the service the rule asks could not answer, or `'error'`: the rule threw) and `cause`.
  `validate()`, `checkValidity()` and `submit()` reject with it, so a submission stops. An automatic check logs
  it and keeps the other rules' results; nothing is recorded in the snapshot, and `isValid` is unaffected.

## Timing, and what a submission carries

- **Timing comes from the config only.** The form config's `validationMode` (`onSubmit`, `onChange`, `onBlur`,
  `onTouched`, `all`) and `reValidateMode` (`onSubmit`, `onChange`, `onBlur`) default to `'onSubmit'` and
  `'onChange'` in the config schema, which normalization applies, so a normalized config always carries both
  and the JSON Schema export lists the defaults. The container takes both from the config it is
  given and has no fallback of its own, so no renderer can differ.
- **The `values` of a passed submission** are the values that passed, without the paths that took no part (disabled, or hidden
  by a `show`/`hide` constraint, and everything inside them), plus the config's `payload`: serializable data
  that always travels with a submission, such as ids or context a hidden input used to carry. The payload is
  never rendered, never a value of the form (not in `snapshot.values`, not dirty) and never validated. A key
  that names a field, or a reserved segment, is rejected when the config is validated.
- **One formatter.** `createFormEngine({ formatIssue })` is the `FormIssueFormatter` both bindings read from
  `engine.getIssueFormatter()`; a renderer or provider may override it for one form.

## Entry point

`@schema-engine/forms/state-container` (`src/state-container/index.ts`) exports the contract types, the factory,
`selectFieldState`, `selectValue`, `selectError`, `selectWarning`, `toFieldArrayValue`, `FORM_ROOT`, `FormIssueFormatter`
and `FormValidationFailure`. The conformance suite is not part of it.

`createFormStateContainer({ config, registry, defaults?, rowIds? })` is the whole option list: the elements, the
validation timing and the payload come from the normalized form config.

## Contract

[types.ts](./types.ts) is the contract: `subscribe`, a stable immutable `getSnapshot`, a stable
`getServerSnapshot` and the commands `getValue`, `setValue`, `blur`, `reportNative`, `reset`,
`validate`, `checkValidity`, `submit` and `fieldArray`. No member depends on how it is called.

Reads are pure selectors over the snapshot, memoized per snapshot and path, so they are safe as selectors
for `useSyncExternalStore` or an external store source: `selectFieldState`, `selectValue`, `selectError` and
`selectWarning` in [selectors.ts](./selectors.ts), and `toFieldArrayValue(rowIds, commands)` in
[field-array.ts](./field-array.ts), which builds the React Hook Form style `FieldArrayValue` both bindings
hand to their widgets, memoized by the commands and the row ids. `fieldArray(path)` returns the same commands
object for a path each time, and a path names a position: `contacts.0.phones` is whatever row is at index 0 now.
A field state (`error`, `warning`, `invalid`, `isTouched`, `isDirty`, `isValidating`) is the same object in
every snapshot while it is unchanged. `selectErrorsUnder` and `selectFields` are internal helpers of the module.

### Naming, after React Hook Form

| Here                                 | React Hook Form             | Difference                                                                                             |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------ |
| `selectFieldState(snapshot, path)`   | `getFieldState`             | `{ error, warning, invalid, isTouched, isDirty, isValidating }`; an error is never inherited           |
| `submit()` and its `setServerErrors` | `setError`/`clearErrors`    | Errors are tied to the submission they answer, resolved to rows and applied only to unchanged targets  |
| `reportNative(facts)`                | `shouldUseNativeValidation` | Native validity is reported on its own, is tied to the value, and has the timing of rules              |
| `validate(paths?)`                   | `trigger`                   | Resolves `true` only when its scope is still current; `checkValidity()` is the silent one              |
| `snapshot.validating`                | `validatingFields`          | Superseded checks do not keep a path pending                                                           |
| `snapshot.warnings`                  | none                        | A separate, never blocking channel with the shape of errors                                            |
| `fieldArray(path)` and `rowIds`      | `useFieldArray`             | The same operations and `fields` with stable ids; falsy rows are kept, and row state travels with rows |
| `subscribe` and selectors            | `watch`/`useWatch`          | The reader names what it reads through a pure selector; no proxy tracking                              |
| `reset(values?)`                     | `reset`                     | Default values are copied, never aliased with the live values                                          |

### Rules a container must keep

- Unchanged branches keep their references. Opaque values, such as an array of `File` objects, are never
  copied, frozen or diffed, and are compared by reference.
- `setValue` replaces the whole branch.
- `validate` resolves `false` while any error, from any source, or any native fact, remains at the
  validated paths that take part; `checkValidity` gives the same answer without writing. Writing identical
  errors changes nothing and notifies nobody.
- An explicit `validate` starts re-validation by `reValidateMode` for the paths it covered, whether it passed or
  failed. It marks nothing submitted, so a wizard step, passed or failed, affects only the paths it checked and
  does not surface errors of later steps. The state ends only with
  `reset`, or when a branch write removes the rows it covered. An empty list of paths validates nothing;
  omitting the list validates the form.
- An async result is applied where its fields are now, only while its scope is current (see freshness).
- Ids the container mints are deterministic (walk order of the defaults, one counter per container), so a
  client built from the same defaults matches the server; the `rowIds` option is for a server that rendered
  other state, and an entry whose count differs from the rows is not adopted and logs a warning.
- A row operation validates the array's own rules, not its rows, and `reset` gives every row a new id.
- A command notifies subscribers once, including when it starts a validation.

The rules are tests: `formStateContainerConformance(createStore)` in [test-utils/form-state-container-conformance.ts](../../../../test-utils/form-state-container-conformance.ts)
registers them with vitest, like the renderer conformance suite, with a case for each failure sequence of
the review that motivated freshness, provenance, native facts and participation.
`test/state-container/form-state-container-rules.test.ts` points each rule at a container written to break it,
and two files mock the run tracker and the row anchors to show the late-result cases fail without them.
`test/state-container/form-state-container-interface.test.ts` checks the container against a local copy of
the interface a bridge host needs; it checks the copy, so the host's own declaration has to match it.

## Reference container

`createFormStateContainer(options)` implements the contract with no framework. Validation goes through
`planFormValidation` and `runValidationPlan`, which return what each rule reported by dotted path, with one
debounce scope for recorded validation and one for `checkValidity`; a row operation names the array exactly
(`exactNames`), so its rows are not validated. Dependents of a changed value are found with
`buildDependencyIndex` by comparing the values at every watched path, so a write to a parent such as
`address` re-validates a rule that reads `address.country`; the index keeps each rule's references as
authored, and a late result resolves them against the dependent's path as it was and as it is, so a sibling
reference follows its row and an absolute one stays where it is. The dependency index is cached per container
and rebuilt only when the row count of any array, nested ones included, changes. Values are null-prototype
maps inside and frozen plain records in the snapshot.
