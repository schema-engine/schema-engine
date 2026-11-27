import * as z from 'zod/mini';
import { isZodType } from '@/lib/zod-json-schema';

/**
 * The view schema the JSON Schema export lists a recipe by, built from the schema of each declared slot.
 *
 * @param $type - The recipe's `$type`
 * @param slotSchemas - The slot schemas its spec declared
 *
 * @remarks
 * The recipe's own validation schema is a Standard Schema of no one library, which the export cannot read. A Zod
 * slot is exported in full, as its own schema, and every slot is optional on input and parsed from `{}` when omitted,
 * as the view schema validates it. A slot whose schema is not Zod is listed as an open object, so an editor knows the
 * slot exists, can pick its appearance, and does not reject keys it cannot see; the caller closes `appearance` to the
 * slot's declared axes.
 */
export function createExportedRecipeView(
	$type: string,
	slotSchemas: Readonly<Partial<Record<string, unknown>>>,
): z.ZodMiniType {
	const shape: Record<string, z.ZodMiniType> = { $type: z.literal($type) };
	for (const [slot, schema] of Object.entries(slotSchemas)) {
		if (schema !== undefined) {
			shape[slot] = z.prefault(isZodType(schema) ? schema : z.looseObject({}), {});
		}
	}
	return z.strictObject(shape);
}
