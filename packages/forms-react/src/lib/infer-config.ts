import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Infer the validated output type from a Standard Schema registration config.
 *
 * @example
 * ```typescript
 * import type { InferConfig } from '@schema-engine/forms-react/lib/infer-config';
 * import { InputFieldSchema } from './form-input.types';
 *
 * type InputConfig = InferConfig<typeof InputFieldSchema>;
 * ```
 */
export type InferConfig<TSchema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<TSchema>;

/**
 * Infer the input type accepted by a Standard Schema registration config.
 */
export type InferConfigInput<TSchema extends StandardSchemaV1> = StandardSchemaV1.InferInput<TSchema>;
