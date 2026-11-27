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

The package ships five actions. A registration is passed to `createFormEngine({ actions })`, which adds its `$type` to the engine's action config types; each plugin function builds a registration with the ports you give it, and a ready one is exported where it needs no port.

| `$type`             | Registration                                 | Plugin and its config                                                                                                      | Instance keys                                                                                  | Runs by default on                         |
| ------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `submit`            | `SubmitActionRegistration`                   | `formSubmitPlugin(config)` (`FormSubmitPluginConfig`: `request`, `transformData`, `onSuccess`, `onError`)                  | `endpoint`, `method` (`POST`, `PUT`, `PATCH`), `successMessage`, `errorMessage`, `redirectUrl` | `form_submit`                              |
| `show_notification` | `NotificationActionRegistration`             | `notificationPlugin(config)` (`NotificationPluginConfig`: `onSuccess`, `onError`, `onWarning`, `onInfo`, `onNotification`) | `message`, `variant` (`success`, `error`, `warning`, `info`), `duration`                       | `form_submit_success`, `form_submit_error` |
| `auto_save`         | `AutoSaveActionRegistration` from `/browser` | `autoSavePlugin(config)` (`AutoSavePluginConfig`: `storage`, `shouldSave`, `onSave`, `onError`, `getStorageKey`)           | `storageKey`, `includeSensitive`                                                               | `form_change`                              |
| `reset`             | `ResetActionRegistration` from `/browser`    | `formResetPlugin(config)` (`FormResetPluginConfig`: `storage`, `confirm`, `clearDraft`, `resetForm`, `onReset`)            | `confirmMessage`, `resetToDefaults`                                                            | `form_submit_success`                      |
| `gtm_event`         | `GTMActionRegistration` from `/browser`      | `gtmPlugin(config)` (`GTMPluginConfig`: `tracker`, `onPush`, `onError`)                                                    | `eventName`, `eventData`, `includeFormData`                                                    | `form_submit`, `form_submit_success`       |

The instance of each is typed `FormSubmitAction`, `NotificationAction`, `AutoSaveAction`, `FormResetAction` and `GTMEventAction`. A plugin takes the ports it needs (storage, a tracker, a request function), so a test or a host with its own policy builds its own registration. `@schema-engine/forms/browser` holds the ones that need the browser: `AutoSaveActionRegistration`, `ResetActionRegistration` and `GTMActionRegistration` are built with `localStorage`, the consent tool and `window.confirm`, and `createBrowserActionRegistrations({ storage?, consent?, confirm? })` (`BrowserActionRegistrationsOptions`) builds the same three over ports you inject. Auto-save writes only while consent is granted. The tools are `GDPRConsent` (`createGDPRConsent(storage?)`, a `GDPRConsentTool` over a `BrowserStorage`: `hasConsent`, `grantConsent`, `revokeConsent`, `getConsent` as a `GDPRConsentStatus`, `needsConsentUpdate`, and `saveDraft`, `loadDraft` and `clearDraft`), `GTMTracker` (pushes events to the data layer; the plugin's `tracker` is any `GTMTrackerInterface`, an object with `push(eventName, eventData)`), and the draft storage: `localStorageAutoSaveStorage`, `createLocalStorageAutoSaveStorage(storage)` for another Web Storage, and `removeTrackedAutoSaveDraftKey` and `clearTrackedAutoSaveDrafts`, which drop the drafts consent revocation tracks. `AutoSaveStorage` is the `save`, `load` and `remove` port an auto-save action writes through.

An action of your own is typed with `BuilderActionConfig<$type, schema>` (the engine's keys plus the output of the schema) and `BuilderActionRegistration<$type, schema>`, and its handler receives a `BuilderActionRuntimeContext<Config>`; `FormActionConfig` is the union of the instances an engine's actions accept, and the forms `ActionExecutionResult` adds `redirectUrl` to the generic result, where the page goes once the whole submission succeeded. `FormActionContextFormState` is the form state in the shape the engine reads to build that context (`isValid`, `errors`, `touched`, `submitCount`), and `SubmissionActionResult` is a result as the runtime hands it to `onActionResults`. The trigger names are `FormActionTrigger`, validated by `FormActionTriggerSchema`.

## Triggers

`form_mount`, `form_change`, `form_submit_start`, `form_submit`, `form_submit_success`, `form_submit_error`, `form_submit_complete`, `step_leave`, `step_change` and `step_enter`. Form-level `actions` are dispatched on every trigger, and an action runs when the trigger is one of its own; a step's own `actions` are dispatched too while that step is current. `actions` is a sequence: an inner array is a parallel group that starts together and joins before the next entry.

The step triggers fire only when the current step changes, and a reset fires none. Step and mount actions cannot block anything, and their failures reach `onActionResults`. The submit actions run after validation passed and before `onSubmit`. A submit action that fails with `shouldContinue: false` stops the ones after it and fails the submission. One that fails without it is reported and the rest still run, and `onSubmit` still runs.

## The context

The context carries the values (`formData`), the step (`stepId`, `currentStep`, `totalSteps`), `isValid` and `errors` by dotted path, `fetch` (the engine's, with the CSRF policy applied), an abort `signal` (observe it in a long handler, as `actions.md` explains) and `form`: `reset()`, `setValue(name, value)`, `getValue(name)`, `validate()` (resolving `{ outcome }`, as the container's does) and `checkValidity()` (a boolean). Use `context.fetch` for every request an action makes.
