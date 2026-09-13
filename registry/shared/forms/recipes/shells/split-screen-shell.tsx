/** @jsxImportSource react */
import { getSlotConfig, type SplitScreenShellConfig } from '@schema-engine/forms/recipes';
import { useViewContext } from '@schema-engine/forms-react/contexts';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';
import { cn } from '@/components/schema-engine/forms/lib/utils';

const sideWidths = {
	narrow: 'md:w-1/3',
	normal: 'md:w-1/2',
	wide: 'md:w-2/3',
} as const;

const contentAlignment = {
	top: 'justify-start',
	center: 'justify-center',
	bottom: 'justify-end',
} as const;

export function SplitScreenShell({ slots, viewConfig }: FormShellProps) {
	const {
		sideContent,
		sidePlacement = 'left',
		sideWidth = 'normal',
		contentAlignment: alignment = 'center',
	} = getSlotConfig<SplitScreenShellConfig>(viewConfig, 'shell');
	const { form, activeStep } = useViewContext();
	const title = form.title || activeStep.title;

	return (
		<div className="flex min-h-svh w-full flex-col md:flex-row">
			{title || sideContent ? (
				<aside
					className={cn(
						'flex w-full flex-col justify-center bg-muted p-6 md:p-8',
						sideWidths[sideWidth],
						sidePlacement === 'right' && 'md:order-2',
					)}
				>
					{title ? <h2 className="max-w-md text-2xl font-semibold tracking-tight">{title}</h2> : null}
					{sideContent ? (
						<div className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">{sideContent}</div>
					) : null}
				</aside>
			) : null}
			<div
				className={cn(
					'flex min-w-0 flex-1 flex-col gap-6 overflow-auto p-6 md:p-8',
					contentAlignment[alignment],
				)}
			>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions ? <div className="mt-auto shrink-0">{slots.actions}</div> : null}
			</div>
		</div>
	);
}
