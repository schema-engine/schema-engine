import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext } from '@schema-engine/forms';
import type { FormActionTrigger } from '@schema-engine/forms/actions';

/** The parts of an action result the action controller reads. */
type TestActionResult = { success: boolean; shouldContinue?: boolean };

const testActionSchema = <TType extends string>($type: TType) =>
	z.object({ $type: z.literal($type), id: z.string(), endpoint: z.optional(z.string()) });

export type TestActionContext = BuilderActionRuntimeContext<{ id: string; endpoint?: string }>;

/**
 * Action registration whose config is `{ id, endpoint? }`, so a test engine
 * types the `actions` it accepts and runs the test's `execute`.
 */
export function testAction<const TType extends string>(
	$type: TType,
	defaultTriggers: readonly FormActionTrigger[],
	execute: (context: TestActionContext) => Promise<TestActionResult>,
) {
	return {
		$type,
		schema: testActionSchema($type),
		metadata: { name: $type, defaultTriggers },
		execute,
	};
}
