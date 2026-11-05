import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import type { PlaygroundExampleId } from './action-playground-session';
// oxlint-disable-next-line import/no-unassigned-import -- custom-element types
import './action-playground.script.tsx';
import './action-playground.css';

const EXAMPLES: PlaygroundExampleId[] = ['sequential', 'parallel', 'short-circuit'];

export const ActionPlayground = eco.component<{ example: PlaygroundExampleId }, JsxRenderable>({
	dependencies: {
		scripts: ['./action-playground.script.tsx'],
	},
	render: ({ example }) => <se-action-playground example={example} />,
});

export const ActionFlow = eco.component<Record<string, never>, JsxRenderable>({
	dependencies: {
		scripts: ['./action-playground.script.tsx'],
	},
	render: () => (
		<div class="action-flow not-prose unstyled">
			{EXAMPLES.map((example) => (
				<ActionPlayground example={example} />
			))}
		</div>
	),
});
