import * as z from 'zod/mini';
import { RendererStyleSchema } from './base-field';
import { AppearanceConfigSchema, GridLayoutConfigSchema } from '@schema-engine/layout';

/**
 * Envelope for a registered config object. Per-item Standard Schema validation
 * runs after this parse, keyed by `$type`.
 */
export const TypedConfigEnvelopeSchema = z.looseObject({
	$type: z.string().check(z.minLength(1)),
});

export function createFormStepSchema(parts: { elements: z.ZodMiniType; actions: z.ZodMiniType }) {
	return z.object({
		id: z.string(),
		title: z.string(),
		description: z.optional(z.string()),
		icon: z.optional(z.string()),
		elements: z.array(parts.elements),
		rules: z.optional(z.unknown()),
		constraints: z.optional(z.array(z.unknown())),
		grid: z
			.optional(z.lazy(() => GridLayoutConfigSchema))
			.check(z.describe("Grid for this step's fields; replaces the form's grid for the step.")),
		className: z.optional(z.string()),
		style: z.optional(RendererStyleSchema),
		appearance: z.optional(AppearanceConfigSchema),
		actions: z.optional(z.array(z.union([parts.actions, z.array(parts.actions)]))),
	});
}

/**
 * Shared form JSON shape. Element, action, and view slots are injected by
 * callers so envelope validation, authoring schema export, and the public
 * FormConfigSchema stay aligned.
 */
export function createFormConfigShape(parts: { elements: z.ZodMiniType; view: z.ZodMiniType; actions: z.ZodMiniType }) {
	return z.object({
		id: z.string().check(z.describe('Unique identifier for the form')),
		title: z.optional(z.string()).check(z.describe('Display title of the form')),
		description: z.optional(z.string()).check(z.describe('Description of the form purpose')),
		steps: z.array(createFormStepSchema(parts)),
		view: z.optional(parts.view),
		grid: z.optional(z.lazy(() => GridLayoutConfigSchema)),
		validationMode: z.optional(z.enum(['onSubmit', 'onChange', 'onBlur', 'all'])),
		reValidateMode: z.optional(z.enum(['onSubmit', 'onChange', 'onBlur'])),
		className: z.optional(z.string()),
		style: z.optional(RendererStyleSchema),
		appearance: z.optional(AppearanceConfigSchema),
		actions: z.optional(z.array(z.union([parts.actions, z.array(parts.actions)]))),
	});
}
