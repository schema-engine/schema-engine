# Form runtime

`createFormRuntime` is one framework-free instance per rendered form, shared by every renderer. It owns the
lifecycle around the [state container](../state-container/README.md): action dispatch, submission state and
wizard navigation. Before it, React and Radiant each kept a copy of that, and the copies drifted. Vocabulary:
[CONTEXT.md](../../../../CONTEXT.md#form-runtime).

```ts
const runtime = createFormRuntime({
	engine,
	config, // the normalized form config
	defaults, // optional: over the defaults of the fields
	snapshot, // optional: the server's container snapshot, to hydrate from
	host: { focus: (paths) => …, sync: () => ruiForm.sync(), submitNatively: () => … },
	onSubmit, onChange, onAction, onActionResults, // onAction is typed by the engine's actions
});

const unmount = runtime.mount(); // form_mount once per runtime, and the change watch; the cleanup revokes anything in flight
runtime.container; // the form state
runtime.getSnapshot(); // { submission: { status, failures, submitCount }, steps: { current, navigating, list } }
runtime.getServerSnapshot();
runtime.subscribe(listener);

await runtime.next(); // NavigationOutcome
await runtime.back();
await runtime.goTo('payment');
await runtime.submit(); // SubmitOutcome
runtime.clearSubmission();
```

## Ownership

| Container                                                                                              | Runtime                                                                                                                                                         | Renderer                                                                 |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Values, field state, validation, participation (skipped steps too), the captured submission, `reset()` | Submission status, the one lock, `form_mount`, `form_change` / `onChange`, every action dispatch, step state and navigation, the action context, submit as Next | The element and its context, focus, `sync`, native submit and its events |

The runtime builds the container itself, so no renderer can differ in its timing, payload or participation.
There is no `runtime.reset()` and no `dispose()`: `container.reset()` is the only reset, and the cleanup of
`mount()` is the only teardown.

## The host

`host` is what only the renderer can do:

- `focus(paths)`: focuses the first control with an error among `paths` (the paths of the step's fields that
  have an error); the host picks the first in its document. React gives the field registry's `focusFirst`;
  Radiant the first invalid `se-field` / `rui-field` in document order.
- `sync()`: writes the controls' values into the container and reports their native validity, as a submit
  does. The runtime calls it before it validates for `next`, `goTo` and `submit`, and before an action's
  `form.validate()` or `form.checkValidity()`. React has none: its controls write as the user types.
- `submitNatively()`: called once a submission succeeded, after its actions and `onSubmit` (so the navigation
  cannot cut off the success and complete triggers). The host decides whether it posts: Radiant does when the
  application gave no `onSubmit`, with the engine's CSRF field in the form.

## Outcomes

Every command returns one string of `FormRuntimeOutcome`; `NavigationOutcome` and `SubmitOutcome` are subsets.

```ts
type FormRuntimeOutcome = 'moved' | 'submitted' | 'failed' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled';
type NavigationOutcome = Extract<
	FormRuntimeOutcome,
	'moved' | 'invalid' | 'overtaken' | 'refused' | 'busy' | 'cancelled'
>;
type SubmitOutcome = Extract<
	FormRuntimeOutcome,
	'moved' | 'submitted' | 'failed' | 'invalid' | 'overtaken' | 'busy' | 'cancelled'
>;
```

| Outcome     | Meaning                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moved`     | The current step changed.                                                                                                                                                                         |
| `submitted` | A submission ran and its actions and `onSubmit` succeeded.                                                                                                                                        |
| `failed`    | A submission ran and failed: an action stopped it, `onSubmit` rejected, a trigger failed or validation could not run. The reason is in `snapshot.submission.failures`, never in the return value. |
| `invalid`   | Validation found errors, which are shown and focused.                                                                                                                                             |
| `overtaken` | An edit or a row move outran the check, so there is no verdict: nothing is shown, focused or counted.                                                                                             |
| `refused`   | There was nowhere to go: the last active step, an unknown or skipped step, the current step, or a step not reachable in `linear` navigation.                                                      |
| `busy`      | Another command was running.                                                                                                                                                                      |
| `cancelled` | A reset or an unmount revoked the command, which then wrote nothing.                                                                                                                              |

## Snapshot

```ts
interface FormRuntimeSnapshot {
	submission: {
		status: 'idle' | 'pending' | 'success' | 'error';
		failures: FormSubmissionIssue[];
		submitCount: number;
	};
	steps: { current: string; navigating: boolean; list: FormStepState[] };
}
interface FormStepState {
	id: string;
	skipped: boolean;
	visited: boolean;
	complete: boolean;
	invalid: boolean;
}
```

`getSnapshot()` keeps its identity while nothing it reports changed, even when the values did, so it is safe in
`useSyncExternalStore`. `failures` are issues (`callbackFailed`, `triggerFailed`, `actionFailed`,
`validationFailed`), so the form's one formatter words them. `submitCount` counts submissions that passed or
failed validation: a Next is not one, and neither is a validation that could not run or one an edit outran.
`list` holds every step in config order; only `visited` and `complete` are stored, by step id, and `skipped`
(the step's constraints hide it) and `invalid` (an error at one of its fields) are derived from the container,
so they cannot go stale.

## Rules

- **One lock.** Navigation and submission share it, so Next and submit cannot interleave. `begin` is
  synchronous: a second command in the same tick is `busy`.
- **Reset.** The container snapshot's `generation` goes up on every reset. When it changes the runtime revokes
  the command in flight (`cancelled`), returns the submission to `{ idle, [], 0 }` and the steps to the first,
  and fires no step trigger. A submission's lifecycle is not cut short: once validation passed it runs to its end, so a `reset` action on `form_submit_success` does not keep `form_submit_complete` from running. So an action's `form.reset`, `useFormContext().reset` and a native reset button all
  reset everything.
- **Mount.** `mount()` dispatches `form_mount` the first time only, and watches the container's `values`: a new
  values tree is a change (`form_change` and `onChange`), an error, a touch or a validation result never is. The
  baseline is the server snapshot, so a value written before the effect ran is still reported. The cleanup stops
  the watch and revokes the command in flight; an action already running for `form_mount` or `form_change` is not a command and runs to its end. Mounting again is allowed (React's strict effects do).
- **`next()`** syncs the host, validates the current step's fields, and on failure focuses the step's errors
  and returns `invalid`. On success it marks the step complete and moves to the next active step. On the last
  active step it returns `refused`. It never marks the form submitted. An overtaken check stays put without
  focusing. A rule that could not run is logged and ends `invalid`.
- **`back()`** never validates.
- **`goTo(id)`** refuses an unknown, skipped or current step. Going back is always allowed. Going forward follows
  the config's `navigation`: `linear` (default) needs the target to be visited and validates the current step
  and every active step in between, landing on the first that fails; `free` reaches any active step without
  validating.
- **`submit()`** before the last active step acts as `next()`. On the last active step it runs
  `container.submit()` (every active step takes part), then the actions, then `onSubmit`. On `invalid` it moves
  to the first active step with an error, firing the step triggers, and focuses that step's error paths; an
  error at `FORM_ROOT` alone stays put. After `onSubmit`, a server error on another step moves there by the
  same rule.
- **Step triggers** fire `step_leave` before a change and `step_change`, `step_enter` after it, only when the
  current step changes. They cannot block a move; their failures go to `onActionResults`.
- **Skipped steps.** A step's `show` / `hide` constraints skip it: passed over by `next` and `back`, refused by
  `goTo`, left out of validation and of the submitted values (their values are kept). If the current step
  becomes skipped the runtime moves back to the nearest active step before it, and never forward without
  validating.

The pure part of the step model (`startProgress`, `moveProgress`, `deriveStepStates`, `stepAfter`,
`stepBefore`, `stepsWithErrors`) is in [`engine/step-machine.ts`](../engine/step-machine.ts); the submit
sequence (`form_submit_start`, the submit actions, `onSubmit`, then `form_submit_success` or `form_submit_error`,
then `form_submit_complete`) is [`submission-lifecycle.ts`](./submission-lifecycle.ts), internal to the runtime.
