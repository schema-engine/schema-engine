/**
 * Type utilities for FormComposer
 *
 * These utilities help avoid complex intersection types that cause TypeScript to give up.
 */

/**
 * Extract config type from a Zod schema's parse return type.
 * Since schema is z.ZodType<TConfig>, calling parse returns TConfig.
 */
export type ExtractSchemaType<TSchema> = TSchema extends { parse: (val: any) => infer TConfig }
	? Omit<TConfig, '$type'>
	: unknown;

/**
 * Extract type identifier from a registration object.
 * Works by inferring from the $type property.
 */
export type ExtractTypeId<T> = T extends { $type: infer K } ? K : never;
