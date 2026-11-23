import * as z from 'zod/mini';
import type { BuilderActionRuntimeContext, FormActionTrigger } from '@schema-engine/forms';

/** The parts of an action result the submission lifecycle reads. */
type TestActionResult = { success: boolean; shouldContinue?: boolean };

const testActionSchema = <TType extends string>($type: TType) =>
	z.object({ $type: z.literal($type), id: z.string(), endpoint: z.optional(z.string()) });

export type TestActionContext = BuilderActionRuntimeContext<{ id: string; endpoint?: string }>;

/**
 * Action registration with config `{ $type, id, endpoint? }`. An engine built
 * with it accepts matching `actions` entries and runs `execute`.
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
