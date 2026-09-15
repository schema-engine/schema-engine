import { isServer } from '@ecopages/radiant/is-server';

export type DocsDemoNotificationVariant = 'success' | 'error' | 'warning' | 'info';

export type DocsActionNotificationDetail = {
	message: string;
	variant: DocsDemoNotificationVariant;
	durationMs: number;
};

/** @remarks Handled by {@link installDocsToastShell} in the docs layout client script. */
export const DOCS_ACTION_NOTIFICATION_EVENT = 'schema-engine:docs-action-notification';

/** Notifies the docs shell to show a Radiant toast. */
export function showDocsActionNotification(
	message: string,
	variant: DocsDemoNotificationVariant,
	durationMs = 3000,
): void {
	if (isServer || typeof document === 'undefined') {
		return;
	}

	document.dispatchEvent(
		new CustomEvent(DOCS_ACTION_NOTIFICATION_EVENT, {
			bubbles: true,
			detail: { message, variant, durationMs } satisfies DocsActionNotificationDetail,
		}),
	);
}
