import * as z from 'zod/mini';
import type { ActionConfigBase } from '@schema-engine/actions';
import { FormSubmitActionSchema } from './plugins/form-submit.plugin';
import { FormResetActionSchema } from './plugins/form-reset.plugin';
import { NotificationActionSchema } from './plugins/notification.plugin';
import { AutoSaveActionSchema } from './plugins/auto-save.plugin';
import { GTMEventActionSchema } from './plugins/gtm.plugin';

/** Action configs accepted by an engine's registered action map. */
export type FormActionConfig<TActions extends Record<string, unknown> = Record<string, unknown>> =
	string extends keyof TActions
		? ActionConfigBase<string> & { [key: string]: unknown }
		: [keyof TActions] extends [never]
			? never
			: {
					[K in keyof TActions & string]: { readonly $type: K } & TActions[K] &
						ActionConfigBase<K> & {
							[key: string]: unknown;
						};
				}[keyof TActions & string];

/**
 * Form Action Configuration Schema
 *
 * This runtime schema covers the built-in form action plugins. Each engine
 * applies the schemas of the actions it has registered.
 */
export const FormActionConfigSchema = z.discriminatedUnion('$type', [
	FormSubmitActionSchema,
	FormResetActionSchema,
	NotificationActionSchema,
	AutoSaveActionSchema,
	GTMEventActionSchema,
] as const);
