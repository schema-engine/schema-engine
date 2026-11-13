import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { CardShellConfigSchema } from '@schema-engine/forms/recipes/built-in';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

/**
 * Card shell. Its look lives in `card-shell.css`, which the app imports through `recipes.css`.
 *
 * @remarks
 * The card's `appearance` (`size`, `surface`) is emitted as `data-se-*` attributes; the layout theme's
 * token rules turn them into `--se-space`, `--se-measure`, `--se-border-width`, `--se-shadow` and
 * `--se-surface-background`, which the stylesheet reads. The shell sets no inline style, so a host
 * class on the card or a section overrides it.
 */
export function CardShell({ slots, viewConfig }: FormShellProps) {
	const { appearance } = getSlotConfig(viewConfig, 'shell', CardShellConfigSchema);

	return (
		<div className="se-card-shell">
			<div className="se-card-shell__card" {...getAppearanceAttributes(appearance)}>
				{slots.header ? (
					<div className="se-card-shell__header se-card-shell__section">{slots.header}</div>
				) : null}
				<div className="se-card-shell__content se-card-shell__section">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
