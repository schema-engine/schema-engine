import * as z from 'zod/mini';
import { createFormEngine, defineInput } from '@schema-engine/forms';

/**
 * A field with no rendering, so the examples run without a renderer.
 *
 * @remarks
 * An app registers its renderer's elements and recipes instead: the Radiant ones from `@schema-engine/forms-radiant`,
 * or the React ones copied from the registry.
 */
export const textInput = defineInput({
	$type: 'input',
	schema: z.looseObject({ $type: z.literal('input'), name: z.string() }),
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
