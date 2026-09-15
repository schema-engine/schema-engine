import { createRouter } from '@ecopages/browser-router/client';
import { isServer } from '@ecopages/radiant/is-server';
import '@/lib/form-engine-setup';
import { installDocsToastShell } from '@/lib/docs-toast-shell';

const BASE_LAYOUT_CLIENT = Symbol.for('@schema-engine/docs.base-layout-client');

function installBaseLayoutClient(): void {
	if (isServer || typeof document === 'undefined' || BASE_LAYOUT_CLIENT in document) {
		return;
	}

	Reflect.set(document, BASE_LAYOUT_CLIENT, true);
	installDocsToastShell();
	createRouter();
}

installBaseLayoutClient();
