import * as z from 'zod/mini';
import { expectTypeOf } from 'vitest';
import { createFormEngine } from '@/engine/create-form-engine';
import { defineInput } from '@/types';
import {
	createDefaultValidationRegistry,
	createValidationRegistry,
	type ValidationRegistration,
	type ValidationRegistrationConstraint,
} from '@/schemas/validation';
import { anyValue } from '../lib/any-value';

type PostcodeRule = { type: 'postcode'; country: string; message?: string };

const postcode: ValidationRegistration<PostcodeRule> = {
	$type: 'postcode',
	schema: z.object({ type: z.literal('postcode'), country: z.string(), message: z.optional(z.string()) }),
	metadata: { name: 'Postcode' },
	category: 'string',
	handler: (rule) => z.string().check(z.minLength(rule.country.length)),
};

const notASchema = { ...postcode, handler: () => 'nope' };

const input = {
	$type: 'postcode-input',
	schema: z.object({ $type: z.literal('postcode-input'), name: z.string() }),
	metadata: { name: 'Postcode input', category: 'input' },
	render: () => null,
} as const;

/** A registration typed for one rule shape is accepted wherever validations are taken. */
createFormEngine({ validations: [postcode] });
createFormEngine().extend({ validations: [postcode] });
defineInput({ value: anyValue, ...input, validations: [postcode] });
createValidationRegistry([postcode]);
createDefaultValidationRegistry([postcode]);

/** A handler that does not return a Zod Mini schema is rejected everywhere. */
// @ts-expect-error handler returns a string, not a schema
createFormEngine({ validations: [notASchema] });
// @ts-expect-error handler returns a string, not a schema
defineInput({ ...input, validations: [notASchema] });
// @ts-expect-error handler returns a string, not a schema
createValidationRegistry([notASchema]);
// @ts-expect-error handler returns a string, not a schema
createDefaultValidationRegistry([notASchema]);

expectTypeOf(createValidationRegistry).parameter(0).toEqualTypeOf<readonly ValidationRegistrationConstraint[]>();
expectTypeOf(createDefaultValidationRegistry)
	.parameter(0)
	.toEqualTypeOf<readonly ValidationRegistrationConstraint[] | undefined>();
expectTypeOf<ReturnType<ValidationRegistrationConstraint['handler']>>().toExtend<z.ZodMiniType>();
