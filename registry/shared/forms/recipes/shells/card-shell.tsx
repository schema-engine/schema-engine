import type React from 'react';
import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { CardShellConfigSchema } from '@schema-engine/forms/recipes/built-in';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

/**
 * Card geometry read from the engine's appearance tokens.
 *
 * @remarks
 * The card's `appearance` (`size`, `surface`) sets `--se-size-*` and `--se-surface-*` through the
 * engine's token rules; the fallbacks are the look of an unstyled card, so a form that picks nothing renders as before.
 */
const cardStyle: React.CSSProperties = {
	maxWidth: 'var(--se-size-max-width, 28rem)',
	borderWidth: 'var(--se-surface-border-width, 1px)',
	boxShadow: 'var(--se-surface-shadow, 0 8px 24px color-mix(in srgb, var(--on-surface, #000) 10%, transparent))',
};

const sectionStyle: React.CSSProperties = { padding: 'var(--se-size-padding, 1.5rem)' };

export function CardShell({ slots, viewConfig }: FormShellProps) {
	const { appearance } = getSlotConfig(viewConfig, 'shell', CardShellConfigSchema);

	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/30 p-4 md:p-8">
			<div
				className="w-full rounded-xl border bg-card text-card-foreground"
				style={cardStyle}
				{...getAppearanceAttributes(appearance)}
			>
				{slots.header ? (
					<div className="border-b text-center" style={sectionStyle}>
						{slots.header}
					</div>
				) : null}
				<div className="flex min-w-0 flex-col gap-6" style={sectionStyle}>
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
