import { SubmitActionRegistration, notificationPlugin } from '@schema-engine/forms';
import { ResetActionRegistration } from '@schema-engine/forms/browser';

/** What a `show_notification` action announces. */
export interface Notice {
	message: string;
	variant: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Where notifications go. A real app hands them to its toast library here instead.
 *
 * @remarks
 * `NotificationActionRegistration`, the package's own registration, only logs, because the package cannot know
 * how an app shows a message. `notificationPlugin` takes the one function that does.
 */
export const notices = new EventTarget();

const NotificationRegistration = notificationPlugin({
	onNotification: (message, variant) => {
		notices.dispatchEvent(new CustomEvent<Notice>('notice', { detail: { message, variant } }));
	},
});

/**
 * The actions the config names, each registered by hand: an action runs only when its engine has its registration.
 *
 * @remarks
 * `submit` sends the values to `endpoint` with the engine's `fetch`, as form data, and expects JSON back.
 * `show_notification` runs {@link notices}. `reset` clears the form, and lives in `@schema-engine/forms/browser`
 * because it uses browser storage.
 */
export const actions = [SubmitActionRegistration, NotificationRegistration, ResetActionRegistration];
