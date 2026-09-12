/** @jsxImportSource react */
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

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
