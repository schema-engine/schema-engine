import { isServer } from '@ecopages/radiant/is-server';
import { toast, type ToastPosition, type ToastVariant } from '@ecopages/radiant-ui/toast';
import {
	DOCS_ACTION_NOTIFICATION_EVENT,
	type DocsActionNotificationDetail,
	type DocsDemoNotificationVariant,
} from '@/lib/docs-demo-notification';

const TOAST_POSITION: ToastPosition = 'bottom-end';
const INSTALLED = Symbol.for('@schema-engine/docs.toast-shell');

const VARIANT_MAP: Record<DocsDemoNotificationVariant, ToastVariant> = {
	success: 'success',
	error: 'error',
	warning: 'warning',
	info: 'info',
};

/** Mounts a client-only `<rui-toaster>`; SSR hosts do not re-render toast children after hydration. */
function ensureDocsToaster(): void {
	for (const host of document.querySelectorAll('rui-toaster')) {
		host.remove();
	}

	const host = document.createElement('rui-toaster');
	host.setAttribute('position', 'bottom-end');
	document.body.appendChild(host);
}

function showDocsToast(detail: DocsActionNotificationDetail): void {
	const options = { duration: detail.durationMs, position: TOAST_POSITION };
	const variant = VARIANT_MAP[detail.variant] ?? 'info';

	switch (variant) {
		case 'success':
			toast.success(detail.message, options);
			break;
		case 'error':
			toast.error(detail.message, options);
			break;
		case 'warning':
			toast.warning(detail.message, options);
			break;
		default:
			toast.info(detail.message, options);
			break;
	}
}

function onDocsActionNotification(event: Event): void {
	if (!(event instanceof CustomEvent)) {
		return;
	}

	const detail = event.detail as DocsActionNotificationDetail | undefined;
	if (!detail?.message) {
		return;
	}

	showDocsToast(detail);
}

function onDocsToastAfterSwap(): void {
	void customElements.whenDefined('rui-toaster').then(() => {
		ensureDocsToaster();
	});
}

/**
 * Wires `show_notification` demos to `rui-toaster`.
 *
 * @remarks Docs pages load `docs-shell.script.ts`, not `base-layout.script.ts`,
 * because `BaseLayout` is a nested component there. Call this from every docs
 * client entry that owns the shell. Idempotent on `document` so HMR and dual
 * layout scripts do not stack listeners.
 */
export function installDocsToastShell(): void {
	if (isServer || typeof document === 'undefined' || INSTALLED in document) {
		return;
	}

	Reflect.set(document, INSTALLED, true);
	document.addEventListener(DOCS_ACTION_NOTIFICATION_EVENT, onDocsActionNotification);
	document.addEventListener('eco:after-swap', onDocsToastAfterSwap);

	void customElements.whenDefined('rui-toaster').then(() => {
		ensureDocsToaster();
	});
}
