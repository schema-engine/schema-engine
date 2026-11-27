# Actions in a form

Code that runs on a form event. The runtime runs a form's actions with the dispatcher of `@schema-engine/actions` (`actions.md`), which owns sequences, parallel groups, cancellation and results. The runtime and the submission sequence are in `forms.md` and `forms-submission.md`.

## An action

An action is a registration, `{ $type, schema, metadata, execute }`, written with `defineAction<BuilderActionBaseContext, FormActionTrigger>()` (`actions.md` explains `defineAction`), and an instance in the config, `{ $type, id, ...config, triggers? }`. `schema` is any Standard Schema and describes the action's own arguments: the engine checks `id`, `$type`, `enabled` and `triggers` (a form trigger name) itself, so a schema never lists them. `metadata.defaultTriggers` says when it runs unless the instance sets its own `triggers`. `execute` receives the form's context, with the instance as `config`, and returns `{ success, message?, error?, data?, shouldContinue? }`; `shouldContinue: false` stops the sequence. Register it in `createFormEngine({ actions })`. The engine checks the `actions` of a form and of a step against the registered schemas when it validates the form (`defineForm`, `validateForm`): a bad action is a config issue whose path is the owner's `actions`, the index of the entry (and of the member, in a group), then the path the action's schema reported, and only checked actions reach the dispatcher.

```ts title="forms/notify-action.ts"
import * as z from 'zod/mini';
import { defineAction, type ActionConfigBase } from '@schema-engine/actions';
import { createFormEngine, type BuilderActionBaseContext, type FormActionTrigger } from '@schema-engine/forms';
import { textRegistration } from './engine';

const defineFormAction = defineAction<BuilderActionBaseContext, FormActionTrigger>();

interface NotifyConfig extends ActionConfigBase<'notify'> {
	channel: string;
}

export const notifyAction = defineFormAction<NotifyConfig>({
	$type: 'notify',
	schema: z.object({ channel: z.string() }),
	metadata: { name: 'Notify', defaultTriggers: ['form_submit'] },
	execute: async ({ config, formData, fetch }) => {
		const response = await fetch('/api/notify', {
			method: 'POST',
			body: JSON.stringify({ channel: config.channel, formData }),
		});
		return response.ok ? { success: true } : { success: false, error: `Notify failed with ${response.status}` };
	},
});

export const notifyEngine = createFormEngine({ elements: [textRegistration], actions: [notifyAction] });

export const notifyForm = notifyEngine.defineForm({
	id: 'notify',
	steps: [{ id: 'main', title: 'Main', elements: [{ $type: 'text', name: 'email' }] }],
	actions: [{ $type: 'notify', id: 'notify-ops', channel: 'ops' }],
});
```

## Built-in actions

The package ships five actions; none is registered until you pass it to `createFormEngine({ actions })`. Each `...Plugin(config)` builds a registration over the ports and callbacks you give it, and a ready registration is exported beside it.

| `$type`             | Ready registration                           | Plugin and its config                                                                                | Instance keys (default)                                                                           | Runs by default on                         |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `submit`            | `SubmitActionRegistration`                   | `formSubmitPlugin`: `request`, `transformData`, `onSuccess`, `onError`                               | `endpoint`, `method` (`POST`; or `PUT`, `PATCH`), `successMessage`, `errorMessage`, `redirectUrl` | `form_submit`                              |
| `show_notification` | `NotificationActionRegistration`             | `notificationPlugin`: `onSuccess`, `onError`, `onWarning`, `onInfo`, `onNotification`                | `message`, `variant` (`info`; or `success`, `error`, `warning`), `duration` (3000)                | `form_submit_success`, `form_submit_error` |
| `auto_save`         | `AutoSaveActionRegistration` from `/browser` | `autoSavePlugin`: `storage` (required), `shouldSave`, `onSave`, `onError`, `getStorageKey`           | `storageKey`, `includeSensitive` (`false`)                                                        | `form_change`                              |
| `reset`             | `ResetActionRegistration` from `/browser`    | `formResetPlugin`: `storage` (required), `confirm`, `clearDraft`, `resetForm`, `onReset`             | `confirmMessage`, `resetToDefaults` (`true`)                                                      | `form_submit_success`                      |
| `gtm_event`         | `GTMActionRegistration` from `/browser`      | `gtmPlugin`: `tracker` (required, any object with `push(eventName, eventData)`), `onPush`, `onError` | `eventName`, `eventData`, `includeFormData`                                                       | `form_submit`, `form_submit_success`       |

The plugins and the first two registrations come from `@schema-engine/forms`. The three in `@schema-engine/forms/browser` are built over `localStorage`, `window.confirm` and the shared consent tool, and auto-save writes only while consent is granted; `createBrowserActionRegistrations({ storage?, consent?, confirm? })` builds the same three over ports you inject, for a test or a host with its own policy. The same entry holds those ports:

- `GDPRConsent` is the consent tool over `localStorage`, and `createGDPRConsent(storage?)` builds one over another Web Storage. It has `hasConsent`, `grantConsent`, `revokeConsent`, `getConsent`, `needsConsentUpdate`, and `saveDraft`, `loadDraft` and `clearDraft`.
- `localStorageAutoSaveStorage` is the `storage` port (`save`, `load`, `remove`) over `localStorage`, and `createLocalStorageAutoSaveStorage(storage)` builds one over another Web Storage. Both record each key they write, so `clearTrackedAutoSaveDrafts(storage)` removes every draft they saved and `removeTrackedAutoSaveDraftKey(storage, key)` removes one.
- `GTMTracker` pushes events to `window.dataLayer`.

A result may add `redirectUrl`: once the whole submission succeeded, the runtime navigates to the one the last successful action returned. `FormActionTriggerSchema` validates a trigger name.

## Triggers

`form_mount`, `form_change`, `form_submit_start`, `form_submit`, `form_submit_success`, `form_submit_error`, `form_submit_complete`, `step_leave`, `step_change` and `step_enter`. Form-level `actions` are dispatched on every trigger, and an action runs when the trigger is one of its own; a step's own `actions` are dispatched too while that step is current. `actions` is a sequence: an inner array is a parallel group that starts together and joins before the next entry.

The step triggers fire only when the current step changes, and a reset fires none. Step and mount actions cannot block anything, and their failures reach `onActionResults`. The submit actions run after validation passed and before `onSubmit`. A submit action that fails with `shouldContinue: false` stops the ones after it and fails the submission. One that fails without it is reported and the rest still run, and `onSubmit` still runs.

## The context

The context carries the values (`formData`), the step (`stepId`, `currentStep`, `totalSteps`), `isValid` and `errors` by dotted path, `fetch` (the engine's, with the CSRF policy applied), an abort `signal` (observe it in a long handler, as `actions.md` explains) and `form`: `reset()`, `setValue(name, value)`, `getValue(name)`, `validate()` (resolving `{ outcome }`, as the container's does) and `checkValidity()` (a boolean). Use `context.fetch` for every request an action makes.
