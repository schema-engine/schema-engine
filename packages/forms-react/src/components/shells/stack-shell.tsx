import type { FormShellProps } from '@/recipes/types';

export function StackShell({ slots }: FormShellProps) {
	return (
		<div className="flex min-w-0 w-full flex-col gap-6">
			{slots.header}
			{slots.progress}
			{slots.content}
			{slots.actions}
		</div>
	);
}
