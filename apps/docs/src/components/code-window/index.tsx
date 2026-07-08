import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

export type CodeWindowTab = {
	id: string;
	label: string;
	content: JsxRenderable;
};

export type CodeWindowProps = {
	id?: string;
	tabs?: CodeWindowTab[];
	defaultTabId?: string;
	label?: string;
	footer?: JsxRenderable;
	children?: JsxRenderable;
	class?: string;
};

let nextId = 0;
const newId = (): string => `code-window-${++nextId}`;

/**
 * A code window: macOS-style traffic lights, a header label, optional
 * tab strip, and a body that renders the active tab's content.
 *
 * The window is a pure server-rendered surface. The tab strip uses
 * inline anchors with `data-code-tab-target` so a tiny client script
 * can toggle visibility without bringing in a heavy island.
 */
const Shell = ({
	id,
	tabs,
	defaultTabId,
	label,
	footer,
	children,
	class: className,
}: CodeWindowProps) => {
	const instanceId = id ?? newId();
	const tablistId = `${instanceId}-tabs`;
	const bodyId = `${instanceId}-body`;
	return (
		<div
			class={
				className ??
				'flex flex-col rounded-md border border-border bg-background-accent overflow-hidden'
			}
		>
			<div class="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-muted">
				<div class="flex items-center gap-1.5" aria-hidden="true">
					<span class="w-2.5 h-2.5 rounded-full bg-destructive" />
					<span class="w-2.5 h-2.5 rounded-full bg-yellow-500" />
					<span class="w-2.5 h-2.5 rounded-full bg-green-500" />
				</div>
				{label ? (
					<p class="text-xs font-mono text-on-background/60 m-0">{label}</p>
				) : null}
			</div>
			{tabs && tabs.length > 0 ? (
				<div
					role="tablist"
					id={tablistId}
					aria-controls={bodyId}
					class="flex border-b border-border bg-background-accent/40"
				>
					{tabs.map((tab) => (
						<a
							role="tab"
							href={`#${instanceId}-${tab.id}`}
							data-code-tab={tab.id}
							data-code-tab-target={bodyId}
							aria-selected={tab.id === defaultTabId ? 'true' : 'false'}
							class={
								tab.id === defaultTabId
									? 'px-4 py-2 text-xs font-mono font-semibold text-on-background border-b-2 border-primary -mb-px'
									: 'px-4 py-2 text-xs font-mono text-on-background/60 hover:text-on-background'
							}
						>
							{tab.label}
						</a>
					))}
				</div>
			) : null}
			<div id={bodyId} class="bg-background">
				{tabs && tabs.length > 0
					? tabs.map((tab) => (
							<div
								data-code-tab-panel={tab.id}
								hidden={tab.id !== defaultTabId}
							>
								{tab.content}
							</div>
						))
					: children}
			</div>
			{footer ? (
				<div class="px-4 py-2.5 border-t border-border bg-muted text-xs text-on-background/60">
					{footer}
				</div>
			) : null}
		</div>
	);
};

export const CodeWindow = eco.component<CodeWindowProps, JsxRenderable>({
	dependencies: {
		scripts: ['./code-window.script.ts'],
	},
	render: (props) => <Shell {...props} />,
});
