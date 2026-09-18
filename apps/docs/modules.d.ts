/* oxlint-disable import/no-unassigned-import -- ambient module augmentation */
import type { JsxIntrinsicAttributes } from '@ecopages/jsx';
import '@ecopages/content-processor/types';
import '@ecopages/core/declarations';
import '@ecopages/core/env';
import '@ecopages/react/declarations';
/* oxlint-enable import/no-unassigned-import */

declare module '*.css';

declare global {
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}

	/**
	 * Attribute bag for a custom element declared in `JSX.IntrinsicElements`.
	 *
	 * The Ecopages 0.2-rc line stopped shipping this global, but its own
	 * `@ecopages/scripts-injector` types still reference it, so the app supplies it.
	 */
	type HtmlTag = JsxIntrinsicAttributes;
}

export {};
