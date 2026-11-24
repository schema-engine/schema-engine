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

/** Where the confetti starts, as fractions of the viewport. */
interface ConfettiOrigin {
	x: number;
	y: number;
}

const DEFAULT_ORIGIN: ConfettiOrigin = { x: 0.5, y: 0.7 };

function isElementWithConfig(element: Element): element is Element & { config: { id?: unknown } } {
	return 'config' in element && typeof element.config === 'object' && element.config !== null;
}

/**
 * Finds where the confetti should start for the form that was submitted.
 *
 * @remarks
 * The Radiant `se-form-instance` carries its config, so the form is the instance whose config `id` is `formId`. The
 * origin is the centre of its submit button, else of the form. A form that is not found (the React renderer renders no
 * such element) keeps {@link DEFAULT_ORIGIN}. The canvas covers the viewport, so the rect is divided by its size and
 * clamped to it.
 */
function resolveOrigin(formId: string): ConfettiOrigin {
	const form = Array.from(document.querySelectorAll('se-form-instance')).find(
		(element) => isElementWithConfig(element) && element.config.id === formId,
	);
	const target = form?.querySelector('button[type="submit"]') ?? form;
	if (!target) return DEFAULT_ORIGIN;
	const rect = target.getBoundingClientRect();
	if (rect.width === 0 && rect.height === 0) return DEFAULT_ORIGIN;
	const clamp = (value: number) => Math.min(1, Math.max(0, value));
	return {
		x: clamp((rect.left + rect.width / 2) / window.innerWidth),
		y: clamp((rect.top + rect.height / 2) / window.innerHeight),
	};
}

/**
 * Creates the `celebrate` action: a burst of confetti over the page.
 *
 * @remarks
 * The one place the docs show that an action is defined once in code and a document only names it. `canvas-confetti`
 * is imported inside `execute`, so it is a separate chunk that nothing downloads before the first celebration.
 * Under `prefers-reduced-motion: reduce` the action succeeds without loading it, so the visitor gets no motion and no
 * download. The burst starts at the submit button of the submitted form.
 *
 * The animation is not awaited: the dispatcher waits for every action before the submission counts as finished, so
 * waiting for the confetti to fall would hold back the actions after it (the reset) and the end of the submission.
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
				void confetti({
					particleCount: context.config.particleCount,
					spread: 80,
					origin: resolveOrigin(context.formId),
				});
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
