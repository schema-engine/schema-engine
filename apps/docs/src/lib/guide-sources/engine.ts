import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';

/**
 * A field that draws nothing: a renderer under construction draws it itself.
 *
 * @remarks
 * An app registers the elements and recipes of its renderer instead.
 */
export const textInput = defineInput({
	$type: 'input',
	schema: z.looseObject({ $type: z.literal('input'), name: z.string(), label: z.optional(z.string()) }),
	metadata: { name: 'Input', category: 'input' },
	value: () => z.string(),
	render: () => null,
});

/** The wizard recipe a multi-step form without a `view` falls back to. */
export const bareControls = {
	$type: 'bare-controls',
	kind: 'wizard',
	slots: ['actions'],
	schema: z.looseObject({ $type: z.literal('bare-controls') }),
	metadata: { name: 'Bare controls' },
	render: () => null,
} as const;

export const engine = createFormEngine({ elements: [textInput], recipes: [bareControls] });
