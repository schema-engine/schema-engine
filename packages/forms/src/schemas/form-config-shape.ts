import { z } from 'zod';
import { GridLayoutConfigSchema } from './base-field';

/**
 * Envelope for a registered config object. Per-item Standard Schema validation
 * runs after this parse, keyed by `$type`.
 */
export const TypedConfigEnvelopeSchema = z.looseObject({
	$type: z.string().min(1),
});

export function createFormStepSchema(parts: { elements: z.ZodTypeAny; actions: z.ZodTypeAny }) {
	return z.object({
		id: z.string(),
		title: z.string(),
		description: z.string().optional(),
		icon: z.string().optional(),
		elements: z.array(parts.elements),
		rules: z.any().optional(),
		constraints: z.array(z.any()).optional(),
		className: z.string().optional(),
		style: z.record(z.string(), z.any()).optional(),
		onStepEnter: z.array(parts.actions).optional(),
		onStepLeave: z.array(parts.actions).optional(),
		onStepValidate: z.array(parts.actions).optional(),
		actions: z.array(parts.actions).optional(),
	});
}

/**
 * Shared form JSON shape. Element, action, and view slots are injected by
 * callers so envelope validation, authoring schema export, and the public
 * FormConfigSchema stay aligned.
 */
export function createFormConfigShape(parts: { elements: z.ZodTypeAny; view: z.ZodTypeAny; actions: z.ZodTypeAny }) {
	return z.object({
		id: z.string().describe('Unique identifier for the form'),
		title: z.string().optional().describe('Display title of the form'),
		description: z.string().optional().describe('Description of the form purpose'),
		steps: z.array(createFormStepSchema(parts)),
		view: parts.view.optional(),
		grid: z.lazy(() => GridLayoutConfigSchema).optional(),
		validationMode: z.enum(['onSubmit', 'onChange', 'onBlur', 'all']).optional(),
		reValidateMode: z.enum(['onSubmit', 'onChange', 'onBlur']).optional(),
		className: z.string().optional(),
		style: z.record(z.string(), z.any()).optional(),
		actions: z.array(parts.actions).optional(),
	});
}
