import * as z from 'zod/mini';
import { resolveExportSchema } from '@/lib/export-schema';

/**
 * The view schema the JSON Schema export lists a recipe by, built from the schema of each declared slot.
 *
 * @param $type - The recipe's `$type`
 * @param slotSchemas - The slot schemas its spec declared
 * @param openSlot - The open object a slot is listed by when the export cannot read its schema
 *
 * @remarks
 * The recipe's own validation schema is a Standard Schema of no one library, which the export cannot read. Each slot is
 * read by {@link resolveExportSchema}, and every slot is optional on input and parsed from `{}` when omitted, as the
 * view schema validates it. A Zod slot is exported in full, as its own schema. A slot that exports itself as Standard
 * JSON Schema is exported as what it returns. Any other slot is listed by `openSlot`, so an editor knows the slot
 * exists, can pick its appearance, and does not reject keys it cannot see. The caller closes `appearance` to the
 * slot's declared axes on the Zod and open slots.
 */
export function createExportedRecipeView(
	$type: string,
	slotSchemas: Readonly<Partial<Record<string, unknown>>>,
	openSlot: (slot: string) => z.ZodMiniType,
): z.ZodMiniType {
	const shape: Record<string, z.ZodMiniType> = { $type: z.literal($type) };
	for (const [slot, schema] of Object.entries(slotSchemas)) {
		if (schema !== undefined) {
			const open = () => openSlot(slot);
			const source = resolveExportSchema(schema, open);
			shape[slot] = z.prefault(source.kind === 'open' ? open() : source.schema, {});
		}
	}
	return z.strictObject(shape);
}
