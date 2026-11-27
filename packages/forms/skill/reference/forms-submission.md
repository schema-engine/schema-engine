# Submission

What happens between the submit button and the server, and how the server's answer comes back. The container and the runtime are in `forms.md`.

## The sequence

On the last active step a submit validates every active step, then runs the `form_submit_start` and `form_submit` actions, then `onSubmit`, then `form_submit_success` or `form_submit_error`, then `form_submit_complete`. `onSubmit(values, helpers)` runs unless a submit action failed with `shouldContinue: false`, and a rejection fails the submission; why it failed is in `snapshot.submission.failures`, as issues the formatter words. `values` are what passed, without the fields that took no part and without any key no field declares, with the config's `payload`. The values the derived schema returns are frozen; with `validateForm(json, { values })` they are the application schema's output, exactly as it returns it. After validation passes and before the actions, the runtime parses them with `engine.submissionSchema(config)`, the schema composed from each input's `value` declaration (and then with your own schema when the form was bound with `engine.validateForm(json, { values })`); a mismatch is a broken element, not a user error, so the submission fails with a `valueMismatch` issue at its path, is logged, and `onSubmit` is not called. A key is required in that schema only when its field has a `required` rule and nothing around it has `constraints` or `disabled`; an optional leaf field's empty value (`''` or `null`) is submitted as it is (a list or a group has none: its empty value is its empty list or object). `engine.defineForm` of a literal config types `onSubmit`, `onAction` and `defaultValues` from the config, and a JSON config gets `FormValues` or the output of its `values` schema.

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

## Types

- Outcomes: `FormRuntimeOutcome` is the union of the eight words a command resolves to (`moved`, `submitted`, `failed`, `invalid`, `overtaken`, `refused`, `busy`, `cancelled`); `NavigationOutcome` is what `next()`, `back()` and `goTo()` can end with and `SubmitOutcome` what `submit()` can (it can end `moved`). The container's own verdicts are `FormValidateResult` (`passed`, `invalid` or `overtaken`) and `FormSubmitResult`, which adds `values` and `setServerErrors` to `passed`.
- State: `SubmissionStatus` is `idle`, `validating`, `submitting`, `success` or `error`, and `isSubmissionBusy(status)` is true for the two in progress, which is what a submit button disables on. `FormSubmissionState` is `{ status, failures, submitCount }` of `FormSubmissionIssue`s. `FormRuntimeSnapshot` is `{ submission, current, navigating, steps }`, and each step is a `FormStepState`: `id`, `title`, `skipped`, `visited`, `complete`, `invalid` and `reachable`. `StepNavigationMode` is the form's `navigation`, `linear` or `free`.
- The wizard: `FormWizard` is `current`, `steps`, `navigating` and the commands `next`, `back` and `goTo`, which a renderer exposes its own way (`useFormWizard()` in React, `FormController.wizard` in Radiant). Step titles are the config's, as authored: the engine does not translate them.
- The runtime: `CreateFormRuntimeOptions` is what `createFormRuntime` takes (`engine`, `config`, `defaults`, `snapshot`, `host`, `onSubmit`, `onChange`, `onAction`, `navigate`, `onActionResults`), `FormRuntime` what it returns, `FormRuntimeConfig` and `FormRuntimeStep` the normalized config as it reads it, and `FormRuntimeHost` what only the renderer can do (`focus`, and optionally `sync` and `submitNatively`). `defaultNavigate(url)` is the `navigate` a runtime has when it is given none: `location.assign` where there is a `location`, and nothing on a server. `FormSubmitHelpers` is the second argument of `onSubmit`, and `FormValues` the nested values it receives.
- The submitted values: `engine.submissionSchema(config)` returns a `SubmissionSchema`, a Standard Schema of the values a form submits that is also a Standard JSON Schema where its value schemas can export one; its `partial` schema checks defaults field by field, which is how the runtime drops a default that does not match. `SubmissionSchemaConfig` is what it reads of the config: its steps and its `payload`.
- Requests: `FormFetch` is the request function every request of a form goes through, which the engine's `fetch` is. `CsrfPolicy` is what `csrf.fromMeta`, `csrf.fromCookie` and `csrf.custom` build: where the token comes from and where it goes. `csrfFieldFor(policy, { method, action })` from `@schema-engine/forms/csrf` is the hidden input a native `POST` to a same-origin action carries the token in, or `undefined` when it must not carry one.
