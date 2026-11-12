import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@schema-engine/forms-react/hooks';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import { type SidebarShellConfig } from '@schema-engine/forms/recipes/built-in';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

export function SidebarShell({ slots, viewConfig }: FormShellProps) {
	const isMobile = useIsMobile();
	const { showSeparator = true } = getSlotConfig<SidebarShellConfig>(viewConfig, 'shell');

	if (isMobile) {
		return (
			<div className="flex min-w-0 w-full flex-col gap-6">
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-row items-stretch">
			{slots.progress ? (
				<aside className="w-72 shrink-0 self-stretch pr-8 lg:pr-12">{slots.progress}</aside>
			) : null}
			{showSeparator ? <Separator orientation="vertical" className="h-auto w-px self-stretch bg-border" /> : null}
			<div className="flex min-w-0 flex-1 flex-col gap-6 pl-8 lg:pl-12">
				{slots.header}
				{slots.content}
				{slots.actions}
			</div>
		</div>
	);
}
