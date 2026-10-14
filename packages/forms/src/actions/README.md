# Form Actions

Form actions connect form lifecycle events to side effects. The forms package
provides typed registrations for common actions and uses the generic execution
engine from [@schema-engine/actions](../../../actions).

## Built-in registrations

Import runtime-neutral registrations from `@schema-engine/forms` and browser
registrations from `@schema-engine/forms/browser`. Importing a registration
also adds its `$type` to the form action configuration types.

```typescript
import { NotificationActionRegistration, SubmitActionRegistration, createFormEngine } from '@schema-engine/forms';
import {
	AutoSaveActionRegistration,
	ResetActionRegistration,
	GTMActionRegistration,
} from '@schema-engine/forms/browser';

const engine = createFormEngine({
	actions: [
		SubmitActionRegistration,
		ResetActionRegistration,
		NotificationActionRegistration,
		AutoSaveActionRegistration,
		GTMActionRegistration,
	],
});
```

Declare action instances in the form configuration:

```typescript
const actions = [
	{
		id: 'submit-form',
		$type: 'submit',
		endpoint: '/api/submit',
		method: 'POST',
	},
	{
		id: 'show-success',
		$type: 'show_notification',
		message: 'Thank you for your submission.',
		variant: 'success',
		triggers: ['form_submit_success'],
	},
];

const formConfig = { id: 'contact', steps: [], actions };
```

An action runs when its `triggers` contains the current event. When an action
does not declare `triggers`, the executor uses the registration's
`metadata.defaultTriggers`.

## Action triggers

The forms action trigger type contains these events:

| Trigger                | When it runs                           |
| ---------------------- | -------------------------------------- |
| `form_mount`           | The form is initialized                |
| `form_change`          | A field value changes                  |
| `form_submit`          | Form submission starts                 |
| `form_submit_start`    | Submission begins after validation     |
| `form_submit_success`  | Submission completes successfully      |
| `form_submit_error`    | Submission fails                       |
| `form_submit_complete` | Submission finishes with either result |
| `step_change`          | The active step changes                |
| `step_submit`          | A step is submitted                    |
| `step_enter`           | A step becomes active                  |
| `step_leave`           | A step stops being active              |
| `step_view`            | A step becomes visible                 |

Actions execute sequentially in the order provided to the executor.

## Plugin factories

Factories return action registrations with configurable handlers. Register the
returned value in `createFormEngine({ actions })`.

### `formSubmitPlugin`

```typescript
import { formSubmitPlugin } from '@schema-engine/forms';

const submit = formSubmitPlugin({
	request: (url, options) => fetch(url, options),
	transformData: (data, context) => ({
		...data,
		formId: context.formId,
	}),
	onSuccess: (data, context) => recordSubmission(context.formId, data),
	onError: (error, context) => reportSubmissionFailure(context.formId, error),
});
```

The submit action accepts `endpoint`, `method` (`POST`, `PUT`, or `PATCH`),
optional `successMessage`, `errorMessage`, `redirectUrl`, and `triggers`.
Submission data is sent as `FormData`.

### `formResetPlugin`

```typescript
import { formResetPlugin } from '@schema-engine/forms';

const reset = formResetPlugin({
	storage: draftStorage,
	confirm: askForResetConfirmation,
	onReset: (context) => recordReset(context.formId),
});
```

The reset action accepts `confirmMessage`, `resetToDefaults`, and `triggers`.
The factory requires an `AutoSaveStorage` port and removes the form's default
auto-save key. It also accepts `clearDraft` and `resetForm` handlers.

### `notificationPlugin`

```typescript
import { notificationPlugin } from '@schema-engine/forms';

const notifications = notificationPlugin({
	onSuccess: (message, context) => showNotice('success', context.formId, message),
	onError: (message, context) => showNotice('error', context.formId, message),
	onWarning: (message, context) => showNotice('warning', context.formId, message),
	onInfo: (message, context) => showNotice('info', context.formId, message),
	onNotification: (message, variant, context) => showNotice(variant, context.formId, message),
});
```

The notification action accepts `message`, `variant` (`success`, `error`,
`warning`, or `info`), `duration`, and `triggers`.

### `autoSavePlugin`

```typescript
import { autoSavePlugin } from '@schema-engine/forms';

const autoSave = autoSavePlugin({
	storage: appDraftStorage,
	getStorageKey: (context) => `form:${context.formId}`,
	onSave: (data, context) => recordDraft(context.formId, data),
	onError: (error, context) => reportDraftFailure(context.formId, error),
});
```

The auto-save action accepts `storageKey`, `includeSensitive`, and `triggers`.
The factory requires an `AutoSaveStorage` port rather than choosing browser
storage. By default, password, secret, and token fields are excluded from saved
data.

### `gtmPlugin`

```typescript
import { gtmPlugin } from '@schema-engine/forms';

const analytics = gtmPlugin({
	tracker: { push: pushAnalyticsEvent },
	onPush: (eventName, eventData, context) => recordAnalyticsEvent(context.formId, eventName, eventData),
});
```

The GTM action accepts `eventName`, `eventData`, `includeFormData`, and
`triggers`. Set `includeFormData` to `true` to include all fields or to an
array of field names to select specific values. The factory requires a tracker
port; the browser data-layer tracker is available from
`@schema-engine/forms/browser`.

## Custom action plugins

Use `BuilderActionRegistration` to create a form-specific action. The schema
uses Zod Mini in this example; any Standard Schema implementation is valid.

```typescript
import * as z from 'zod/mini';
import type { BuilderActionExecutionContext, BuilderActionRegistration } from '@schema-engine/forms';

const ActionSchema = z.object({
	id: z.string(),
	$type: z.literal('log_message'),
	message: z.string(),
	triggers: z.optional(z.array(z.string())),
});

type Action = z.infer<typeof ActionSchema>;

declare global {
	namespace FormEngine {
		interface ActionRegistry {
			log_message: Action;
		}
	}
}

const logMessage: BuilderActionRegistration<'log_message', typeof ActionSchema> = {
	$type: 'log_message',
	schema: ActionSchema,
	metadata: {
		name: 'Log message',
		defaultTriggers: ['form_submit'],
	},
	execute: async (context: BuilderActionExecutionContext<Action>) => {
		publishMessage(context.config.message, context.formId);
		return { success: true, shouldContinue: true };
	},
};
```

The execution context contains the parsed action `config`, the current form
state, and the triggering event. See [@schema-engine/actions](../../../actions)
for the generic registration and execution contracts.
