/** @jsxImportSource react */
import { useEffect } from 'react';
import { registerFormAgentTool } from '@schema-engine/forms/agent-tool';
import { FormRenderer } from '@schema-engine/forms-react';
import { useFormContext, useFormRuntime } from '@schema-engine/forms-react/hooks';
import { engine } from './react-widgets.react';

const feedback = engine.defineForm({
	id: 'feedback',
	steps: [
		{
			id: 'main',
			title: 'Feedback',
			elements: [
				{ $type: 'text', name: 'name', label: 'Name', rules: [{ $type: 'required' }] },
				{ $type: 'rating', name: 'stars', label: 'Rating', description: 'From 1 to 5' },
				{ $type: 'submit', name: 'send', label: 'Send' },
			],
		},
	],
});

/**
 * Offers the form it sits in to a browser agent while it is rendered. Without `autoSubmit` the agent fills the form
 * and the user sends it.
 */
function FeedbackAgentTool() {
	const runtime = useFormRuntime();
	const { formatIssue } = useFormContext();

	useEffect(
		() =>
			registerFormAgentTool(runtime, {
				name: 'send_feedback',
				description: 'Fill in the feedback form: the name of the sender and a rating from 1 to 5.',
				formatIssue,
			}),
		[runtime, formatIssue],
	);

	return null;
}

export function FeedbackForm({ send }: { send: (name: string, stars: number | undefined) => Promise<void> }) {
	return (
		<FormRenderer
			engine={engine}
			config={feedback}
			onSubmit={async (values) => send(values.name, typeof values.stars === 'number' ? values.stars : undefined)}
		>
			<FeedbackAgentTool />
		</FormRenderer>
	);
}
