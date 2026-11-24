import * as z from 'zod/mini';
import type { BuilderActionConfig, BuilderActionRegistration, BuilderActionRuntimeContext } from '@schema-engine/forms';

/**
 * Schema of the `celebrate` action's own arguments.
 *
 * @remarks
 * Strict, so a misspelled argument in a document is an issue instead of being dropped. `parseActions` owns `id`,
 * `$type`, `enabled` and `triggers` and never hands them to this schema.
 */
export const CelebrateActionSchema = z.strictObject({
	/** Optional description for documentation and debugging purposes */
	description: z.optional(z.string()),
	/** How many confetti pieces to launch */
	particleCount: z._default(z.number().check(z.int(), z.gte(1), z.lte(500)), 120),
});

export type CelebrateAction = BuilderActionConfig<'celebrate', typeof CelebrateActionSchema>;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Creates the `celebrate` action: a burst of confetti over the page.
 *
 * @remarks
 * The one place the docs show that an action is defined once in code and a document only names it. `canvas-confetti`
 * is imported inside `execute`, so it is a separate chunk that nothing downloads before the first celebration.
 * Under `prefers-reduced-motion: reduce` the action succeeds without loading it, so the visitor gets no motion and no
 * download.
 */
export function celebrateAction(): BuilderActionRegistration<'celebrate', typeof CelebrateActionSchema> {
	return {
		$type: 'celebrate',
		schema: CelebrateActionSchema,
		metadata: {
			name: 'Celebrate',
			description: 'Launch confetti over the page',
			icon: 'sparkles',
			defaultTriggers: ['form_submit_success'],
		},
		execute: async (context: BuilderActionRuntimeContext<CelebrateAction>) => {
			if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
				return { success: true, message: 'Confetti skipped for reduced motion', shouldContinue: true };
			}
			try {
				const { default: confetti } = await import('canvas-confetti');
				await confetti({ particleCount: context.config.particleCount, spread: 80, origin: { y: 0.7 } });
				return { success: true, message: 'Confetti launched', shouldContinue: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Failed to launch confetti',
					shouldContinue: true,
				};
			}
		},
	};
}
