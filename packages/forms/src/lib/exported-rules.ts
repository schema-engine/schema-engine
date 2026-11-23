import * as z from 'zod/mini';

const RULES_KEY = 'rules' as const;

function isMiniSchema(schema: z.core.$ZodType): schema is z.ZodMiniType {
	return 'check' in schema && typeof schema.check === 'function';
}

function isArraySchema(schema: z.ZodMiniType): schema is z.ZodMiniArray {
	return schema._zod.def.type === 'array';
}

function isObjectSchema(schema: z.ZodMiniType): schema is z.ZodMiniObject {
	return schema._zod.def.type === 'object';
}

function isPipeSchema(schema: z.ZodMiniType): schema is z.ZodMiniPipe {
	return schema._zod.def.type === 'pipe';
}

function isOptionalSchema(schema: z.ZodMiniType): schema is z.ZodMiniOptional {
	return schema._zod.def.type === 'optional';
}

/** The schema with the items of the array it holds replaced, looking through the wrappers an element puts around `rules`. */
function withArrayItem(schema: z.ZodMiniType, item: z.ZodMiniType): z.ZodMiniType {
	if (isArraySchema(schema)) {
		return z.core.clone(schema, { ...schema._zod.def, element: item });
	}
	if (isOptionalSchema(schema)) {
		const inner = schema._zod.def.innerType;
		return isMiniSchema(inner)
			? z.core.clone(schema, { ...schema._zod.def, innerType: withArrayItem(inner, item) })
			: schema;
	}
	if (isPipeSchema(schema)) {
		const input = schema._zod.def.in;
		return isMiniSchema(input)
			? z.core.clone(schema, { ...schema._zod.def, in: withArrayItem(input, item) })
			: schema;
	}
	return schema;
}

/**
 * Types the rules of an element schema for a JSON Schema export.
 *
 * @param rule The schema of one rule, the union of every registered rule's schema.
 *
 * @remarks
 * An element's own `rules` accepts any rule shape, because the validation registry decides what a rule
 * is. The export lists the registered rules instead, so an editor offers each one with its options. A
 * schema without a `rules` key, or whose `rules` is not an array, comes back as it is. The result is for
 * export only: parse with the original. The outer schemas are cloned with the original as their parent, so
 * the title and description registered for them still apply.
 */
export function withExportedRules(schema: z.ZodMiniType, rule: z.ZodMiniType): z.ZodMiniType {
	if (isObjectSchema(schema)) {
		const { shape } = schema._zod.def;
		const rules = shape[RULES_KEY];
		if (!rules || !isMiniSchema(rules)) return schema;
		const typed = withArrayItem(rules, rule);
		if (typed === rules) return schema;
		return z.core.clone(schema, { ...schema._zod.def, shape: { ...shape, [RULES_KEY]: typed } }, { parent: true });
	}
	if (isPipeSchema(schema)) {
		const input = schema._zod.def.in;
		if (!isMiniSchema(input)) return schema;
		const next = withExportedRules(input, rule);
		return next === input ? schema : z.core.clone(schema, { ...schema._zod.def, in: next }, { parent: true });
	}
	return schema;
}
