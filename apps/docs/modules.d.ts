/* oxlint-disable import/no-unassigned-import -- ambient module augmentation */
import '@ecopages/core/declarations';
import '@ecopages/core/env';
/* oxlint-enable import/no-unassigned-import */

declare module '*.css';

declare global {
	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
