/** @jsxImportSource react */
import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { CardShellConfigSchema, cardSpec } from '@schema-engine/forms/recipes/built-in';
import { useActiveStep, useViewContext } from '@schema-engine/forms-react/hooks';
import { defineRecipe, type FormShellProps } from '@schema-engine/forms-react/primitives';

/**
 * The card around the form: it carries the `size` and `surface` picks as attributes and reads the tokens they set.
 *
 * @remarks
 * `--se-space` and `--se-measure` come from the theme's size axis, so the card is as tight as the pick says.
 */
function Shell({ slots, viewConfig }: FormShellProps) {
	const { appearance } = getSlotConfig(viewConfig, 'shell', CardShellConfigSchema);
	return (
		<div
			{...getAppearanceAttributes(appearance)}
			style={{ maxWidth: 'var(--se-measure, 28rem)', margin: '0 auto', padding: 'var(--se-space, 1.5rem)' }}
		>
			{slots.header}
			{slots.content}
			{slots.actions}
		</div>
	);
}

function Header() {
	const { form } = useViewContext();
	const step = useActiveStep();
	return <h2>{step.title || form.title}</h2>;
}

function Actions() {
	const { form } = useViewContext();
	return (
		<button type="submit" disabled={form.isSubmitting}>
			Submit
		</button>
	);
}

export const CardRecipe = defineRecipe(cardSpec, { shell: Shell, slots: { header: Header, actions: Actions } });
