/** @jsxImportSource react */
import * as z from 'zod/mini';
import { defineRecipeSpec, getSlotConfig } from '@schema-engine/forms/recipes';
import { defineRecipe, type FormShellProps } from '@schema-engine/forms-react/primitives';

const BrandFrameShellSchema = z.strictObject({
	label: z._default(z.string(), 'Schema Engine'),
});

function BrandFrameShell({ slots, viewConfig }: FormShellProps) {
	const { label } = getSlotConfig(viewConfig, 'shell', BrandFrameShellSchema);
	return (
		<section className="brand-frame">
			<p className="brand-frame__label">{label}</p>
			<div className="brand-frame__body">{slots.content}</div>
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
