import type { ActionConfigBase, ActionExecutionResult as GenericActionExecutionResult } from '@schema-engine/actions';
import type { ActionArguments } from '@/types/registration.js';

/** Action configs accepted by an engine's registered action map. */
export type FormActionConfig<TActions extends Record<string, unknown> = Record<string, unknown>> =
	string extends keyof TActions
		? ActionConfigBase<string> & { [key: string]: unknown }
		: [keyof TActions] extends [never]
			? never
			: {
					[K in keyof TActions & string]: { readonly $type: K } & ActionArguments<TActions[K]> &
						ActionConfigBase<K> & {
							[key: string]: unknown;
						};
				}[keyof TActions & string];

/** Form actions may request browser navigation after completion. */
export interface ActionExecutionResult<TData = unknown> extends GenericActionExecutionResult<TData> {
	redirectUrl?: string;
}
