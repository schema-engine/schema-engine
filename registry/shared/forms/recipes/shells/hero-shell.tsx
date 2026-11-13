import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { HeroShellConfigSchema } from '@schema-engine/forms/recipes/built-in';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

/**
 * Styles live in `hero-shell.css`, which the app imports through `recipes.css`.
 *
 * @remarks
 * The shell's `appearance` (`size`) is emitted as `data-se-*` attributes and the layout theme's token
 * rules turn it into `--se-space`, which the stylesheet reads. The background image is data, so it stays
 * an inline `background-image` (a relative URL resolves against the page, as in Radiant); the position and
 * size are the stylesheet's. What stays as Tailwind classes is the shadcn theme's colour (`bg-muted`,
 * `bg-card/95`).
 */
export function HeroShell({ slots, viewConfig }: FormShellProps) {
	const { appearance, backgroundImage, backgroundVideo, contentWidth } = getSlotConfig(
		viewConfig,
		'shell',
		HeroShellConfigSchema,
	);

	return (
		<div
			className="se-hero-shell bg-muted text-primary-foreground"
			style={backgroundImage ? { backgroundImage: `url(${JSON.stringify(backgroundImage)})` } : undefined}
			{...getAppearanceAttributes(appearance)}
		>
			{backgroundVideo ? (
				<video autoPlay muted loop playsInline src={backgroundVideo} className="se-hero-shell__video" />
			) : null}
			<div className="se-hero-shell__overlay" />
			<div className={`se-hero-shell__content se-hero-shell__content--${contentWidth}`}>
				{slots.header ? <div className="se-hero-shell__header">{slots.header}</div> : null}
				<div className="se-hero-shell__form bg-card/95 text-card-foreground shadow-lg">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
