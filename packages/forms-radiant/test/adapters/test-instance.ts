import type { FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance, type FormMeta } from '@/lib/instance-view';

/**
 * The instance context of a wizard at `currentStep`: the steps before it complete, and every step up to it visited unless `visited` says otherwise.
 *
 * @param skipped - Ids of steps the values skip.
 */
export function instanceAt(
	meta: FormMeta,
	currentStep: number,
	{
		completed = meta.steps.map((_, index) => index < currentStep),
		visited = meta.steps.map((_, index) => index <= currentStep),
		skipped = [],
	}: { completed?: boolean[]; visited?: boolean[]; skipped?: string[] } = {},
): FormInstanceContextValue {
	return {
		...deriveInitialInstance(meta),
		current: meta.steps[currentStep]?.id ?? '',
		steps: meta.steps.map(({ id }, index) => ({
			id,
			skipped: skipped.includes(id),
			visited: visited[index] ?? false,
			complete: completed[index] ?? false,
			invalid: false,
		})),
	};
}
