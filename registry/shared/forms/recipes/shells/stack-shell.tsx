import type { FormShellProps } from '@schema-engine/forms-react/primitives';

/** Styles live in `stack-shell.css`, which the app imports through `recipes.css`. */
export function StackShell({ slots }: FormShellProps) {
	return (
		<div className="se-stack-shell">
			{slots.header}
			{slots.progress}
			{slots.content}
			{slots.actions}
		</div>
	);
}
