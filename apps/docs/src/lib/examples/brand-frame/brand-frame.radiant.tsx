import * as z from 'zod/mini';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { defineRecipe, defineRecipeSpec, type FormShellProps } from '@schema-engine/forms-radiant';

const BrandFrameShellSchema = z.strictObject({
	label: z._default(z.string(), 'Schema Engine'),
});

function BrandFrameShell({ slots, viewConfig }: FormShellProps) {
	const { label } = getSlotConfig(viewConfig, 'shell', BrandFrameShellSchema);
	return (
		<section class="brand-frame">
			<p class="brand-frame__label">{label}</p>
			<div class="brand-frame__body">{slots.content}</div>
		</section>
	);
}

export const BrandFrameRecipe = defineRecipe(
	defineRecipeSpec({
		$type: 'brand-frame',
		kind: 'single-step',
		slotSchemas: { shell: BrandFrameShellSchema },
		metadata: { name: 'Brand frame', description: 'A labelled frame around the fields' },
	}),
	{ shell: BrandFrameShell, slots: {} },
);
