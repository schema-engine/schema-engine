# Actions

Code that runs on a form event. The actions package is a domain-agnostic, sequential dispatcher; the runtime uses it to run a form's actions. The runtime and the submission sequence are in `forms.md` and `submission.md`.

## An action

An action is a registration, `{ $type, schema, metadata, execute }`, and an instance in the config, `{ $type, id, ...config, triggers? }`. `schema` is any Standard Schema and describes the instance. `metadata.defaultTriggers` says when it runs unless the instance sets its own `triggers`. `execute` receives the form's context, with the instance as `config`, and returns `{ success, message?, error?, data?, shouldContinue? }`; `shouldContinue: false` stops the sequence. Type it with `BuilderActionRegistration`, and register it in `createFormEngine({ actions })`.

```ts title="forms/notify-action.ts"
import * as z from 'zod/mini';
import { createFormEngine, type BuilderActionRegistration } from '@schema-engine/forms';
import { textRegistration } from './engine';

const NotifyActionSchema = z.object({
	$type: z.literal('notify'),
	id: z.string(),
	channel: z.string(),
	enabled: z._default(z.boolean(), true),
	triggers: z.optional(z.array(z.string())),
});

export const notifyAction: BuilderActionRegistration<'notify', typeof NotifyActionSchema> = {
	$type: 'notify',
	schema: NotifyActionSchema,
	metadata: { name: 'Notify', defaultTriggers: ['form_submit'] },
	execute: async ({ config, formData, fetch }) => {
		const response = await fetch('/api/notify', {
			method: 'POST',
			body: JSON.stringify({ channel: config.channel, formData }),
		});
		return response.ok ? { success: true } : { success: false, error: `Notify failed with ${response.status}` };
	},
};

export const notifyEngine = createFormEngine({ elements: [textRegistration], actions: [notifyAction] });

export const notifyForm = notifyEngine.defineForm({
	id: 'notify',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'text', name: 'email' }] }],
	actions: [{ $type: 'notify', id: 'notify-ops', channel: 'ops' }],
});
```

## Triggers

`form_mount`, `form_change`, `form_submit_start`, `form_submit`, `form_submit_success`, `form_submit_error`, `form_submit_complete`, `step_leave`, `step_change` and `step_enter`. Form-level `actions` are dispatched on every trigger, and an action runs when the trigger is one of its own; a step's own `actions` are dispatched too while that step is current. An inner array is a parallel group.

The step triggers fire only when the current step changes, and a reset fires none. Step and mount actions cannot block anything, and their failures reach `onActionResults`. The submit actions run after validation passed and before `onSubmit`. A failed submit action fails the submission, and `shouldContinue: false` stops the ones after it.

## The context

The context carries the values (`formData`), the step (`stepId`, `currentStep`, `totalSteps`), `isValid` and `errors` by dotted path, `fetch` (the engine's, with the CSRF policy applied), an abort `signal` and `form`: `reset()`, `setValue(name, value)`, `getValue(name)`, `validate()` (resolving `{ outcome }`, as the container's does) and `checkValidity()` (a boolean). Use `context.fetch` for every request an action makes.
