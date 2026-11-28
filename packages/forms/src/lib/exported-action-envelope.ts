import * as z from 'zod/mini';
import { FormActionTriggerSchema } from '@/actions/triggers.js';

/**
 * Adds the keys the engine owns to an action schema for a JSON Schema export.
 *
 * @remarks
 * A registration's schema lists the action's own arguments only, because `parseActions` checks `id`, `$type`,
 * `enabled` and `triggers` itself. The export is what an editor reads, so it lists them too. The result is for
 * export only: parse with the original. An object schema is cloned with the original as its parent, so the title and
 * description registered for it still apply; any other schema is intersected with the envelope.
 */
export function withActionEnvelope(schema: z.ZodMiniType, type: string): z.ZodMiniType {
	const envelope = {
		id: z.string().check(z.minLength(1), z.describe('Unique identifier for this action within the form.')),
		$type: z.literal(type),
		enabled: z.optional(z.boolean()).check(z.describe('Whether this action runs. Defaults to true.')),
		triggers: z
			.optional(z.array(FormActionTriggerSchema))
			.check(z.describe("Triggers that replace the action's default triggers for this entry.")),
	};
	if (schema._zod.def.type === 'object') {
		const object = schema as z.ZodMiniObject;
		return z.core.clone(
			object,
			{ ...object._zod.def, shape: { ...envelope, ...object._zod.def.shape } },
			{ parent: true },
		);
	}
	return z.intersection(z.object(envelope), schema);
}
