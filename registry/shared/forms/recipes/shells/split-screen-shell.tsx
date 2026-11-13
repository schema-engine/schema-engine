import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { SplitScreenShellConfigSchema } from '@schema-engine/forms/recipes/built-in';
import { useViewContext } from '@schema-engine/forms-react/hooks';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';
import { cn } from '@/components/schema-engine/forms/lib/utils';

/**
 * Styles live in `split-screen-shell.css`, which the app imports through `recipes.css`.
 *
 * @remarks
 * The panel shows the form title. When the recipe has a header slot, that header must set
 * `fallbackToFormTitle: false` in its slot defaults, or the form title is repeated in the header
 * for steps without a title. A custom recipe that reuses this shell with a header slot must set
 * that default too.
 *
 * The shell's `appearance` (`size`) is emitted as `data-se-*` attributes and the layout theme's token
 * rules turn it into `--se-space`, which the stylesheet reads for both panels. What stays as Tailwind
 * classes is the shadcn theme's colour and type scale.
 */
export function SplitScreenShell({ slots, viewConfig }: FormShellProps) {
	const {
		appearance,
		sideContent,
		sidePlacement,
		sideWidth,
		contentAlignment: alignment,
	} = getSlotConfig(viewConfig, 'shell', SplitScreenShellConfigSchema);
	const { form, activeStep } = useViewContext();
	const title = form.title || (slots.header ? undefined : activeStep.title);

	return (
		<div className="se-split-screen-shell" {...getAppearanceAttributes(appearance)}>
			{title || sideContent ? (
				<aside
					className={cn(
						'se-split-screen-shell__side bg-muted',
						`se-split-screen-shell__side--${sideWidth}`,
						sidePlacement === 'right' && 'se-split-screen-shell__side--right',
					)}
				>
					{title ? (
						<h2 className="se-split-screen-shell__title text-2xl font-semibold tracking-tight">{title}</h2>
					) : null}
					{sideContent ? (
						<div className="se-split-screen-shell__side-content text-sm text-muted-foreground md:text-base">
							{sideContent}
						</div>
					) : null}
				</aside>
			) : null}
			<div className={cn('se-split-screen-shell__main', `se-split-screen-shell__main--${alignment}`)}>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions ? <div className="se-split-screen-shell__actions">{slots.actions}</div> : null}
			</div>
		</div>
	);
}
