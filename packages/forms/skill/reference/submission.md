# Submission

What happens between the submit button and the server, and how the server's answer comes back. The container and the runtime are in `forms.md`.

## The sequence

On the last active step a submit validates every active step, then runs the `form_submit_start` and `form_submit` actions, then `onSubmit`, then `form_submit_success` or `form_submit_error`, then `form_submit_complete`. `onSubmit(values, helpers)` runs only when the actions succeeded, and a rejection fails the submission; why it failed is in `snapshot.submission.failures`, as issues the formatter words. `values` are what passed: frozen, without the fields that took no part, with the config's `payload`.

## onSubmit, server errors and CSRF

`helpers.fetch` is the engine's `fetch` with its CSRF policy applied, so send the values with it and add no token yourself. `helpers.setServerErrors` shows the server's answer to this submission on the fields it names; `FORM_ROOT` stands for the form. Paths are those of `values`, an error is dropped when its row is gone, and it is cleared when its path (or a path its rules read) is edited. Two helpers turn a response into that input: `fromProblemDetails` (RFC 9457 with the `errors[]` extension) and `fromJsonApiErrors`. They throw a `ServerErrorsInputError` for a shape they do not know rather than guess.

`csrf.fromMeta`, `csrf.fromCookie` and `csrf.custom` build the policy. The token is read when a request is made and never kept. It goes as `header` on a same-origin `POST`, `PUT`, `PATCH` or `DELETE` made with the engine's `fetch`, and as a hidden `field` input in a native post.

```ts title="forms/submission.ts"
import { createFormEngine, type FormSubmitHelpers, type FormValues } from '@schema-engine/forms';
import { csrf } from '@schema-engine/forms/csrf';
import { fromProblemDetails } from '@schema-engine/forms/server-errors';
import { textRegistration } from './engine';

export const csrfEngine = createFormEngine({
	elements: [textRegistration],
	csrf: csrf.fromMeta('csrf-token', { header: 'x-csrf-token', field: '_csrf' }),
});

export async function onSubmit(values: FormValues, { fetch, setServerErrors }: FormSubmitHelpers) {
	const response = await fetch('/api/contact', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(values),
	});
	if (!response.ok) setServerErrors(fromProblemDetails(await response.json()));
}
```

An error set on an earlier step moves the wizard there. An error is applied only while it is the latest submission and no reset came between, so a late answer to an old submission does nothing.

## Outcomes

A submit command resolves `submitted`, `failed`, `invalid` (errors are shown and focused), `overtaken` (no verdict: show and focus nothing), `moved` or `refused` (a submit before the last step acts as `next()`: `moved` when it changed the step, `refused` when there is nowhere to go), `busy` or `cancelled`. Treat `overtaken` as "ask again", never as a failed field.

## Wizard steps

A form of several steps is a wizard. `next()` validates the current step and moves to the next active one (`refused` on the last), `back()` never validates, and `goTo(id)` refuses a skipped or unknown step, always allows going back and, going forward, follows `navigation`: `linear` needs the target visited and validates every step on the way, `free` reaches any active step. Submitting before the last step acts as `next()`. A step the answers skip is passed over by `next` and `back`, and its values are kept but not submitted. A reset returns the form to its first step with an idle submission and fires no step trigger; a submission whose values were already captured (`submitting`) is committed, runs to its end and publishes its outcome after the reset.
