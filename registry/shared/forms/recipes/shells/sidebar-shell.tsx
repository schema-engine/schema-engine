import { Separator } from '@/components/ui/separator';
import { getAppearanceAttributes } from '@schema-engine/layout';
import { useIsMobile } from '@schema-engine/forms-react/hooks';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { SidebarShellConfigSchema } from '@schema-engine/forms/recipes/built-in';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

/**
 * Styles live in `sidebar-shell.css`, which the app imports through `recipes.css`.
 *
 * @remarks
 * The shell's `appearance` (`size`) is emitted as `data-se-*` attributes and the layout theme's token
 * rules turn it into `--se-space`, which the stylesheet reads for the gaps. On a small screen the
 * progress slot joins the column instead of sitting beside it.
 */
export function SidebarShell({ slots, viewConfig }: FormShellProps) {
	const isMobile = useIsMobile();
	const { appearance, showSeparator } = getSlotConfig(viewConfig, 'shell', SidebarShellConfigSchema);
	const appearanceAttributes = getAppearanceAttributes(appearance);

	if (isMobile) {
		return (
			<div className="se-sidebar-shell se-sidebar-shell--stacked" {...appearanceAttributes}>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions}
			</div>
		);
	}

	return (
		<div className="se-sidebar-shell" {...appearanceAttributes}>
			{slots.progress ? <aside className="se-sidebar-shell__progress">{slots.progress}</aside> : null}
			{showSeparator ? (
				<Separator orientation="vertical" className="se-sidebar-shell__separator bg-border" />
			) : null}
			<div className="se-sidebar-shell__main">
				{slots.header}
				{slots.content}
				{slots.actions}
			</div>
		</div>
	);
}
