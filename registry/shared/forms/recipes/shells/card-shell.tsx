/** @jsxImportSource react */
import { getSlotConfig, type CardShellConfig } from '@schema-engine/forms/recipes';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';
import { cn } from '@/components/schema-engine/forms/lib/utils';

const maxWidths = {
	sm: 'max-w-sm',
	md: 'max-w-md',
	lg: 'max-w-lg',
	xl: 'max-w-xl',
} as const;

const paddings = {
	sm: 'p-4',
	md: 'p-6',
	lg: 'p-8',
} as const;

const shadows = {
	sm: 'shadow-sm',
	md: 'shadow-md',
	lg: 'shadow-lg',
	xl: 'shadow-xl',
} as const;

export function CardShell({ slots, viewConfig }: FormShellProps) {
	const { maxWidth = 'md', padding = 'md', shadowSize = 'md' } = getSlotConfig<CardShellConfig>(viewConfig, 'shell');
	const paddingClass = paddings[padding];

	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/30 p-4 md:p-8">
			<div
				className={cn(
					'w-full rounded-xl border bg-card text-card-foreground',
					maxWidths[maxWidth],
					shadows[shadowSize],
				)}
			>
				{slots.header ? <div className={cn('border-b text-center', paddingClass)}>{slots.header}</div> : null}
				<div className={cn('flex min-w-0 flex-col gap-6', paddingClass)}>
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
