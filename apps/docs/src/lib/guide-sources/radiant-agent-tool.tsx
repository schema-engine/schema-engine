import * as z from 'zod/mini';
import { defineStatic } from '@schema-engine/forms';
import { registerFormAgentTool } from '@schema-engine/forms/agent-tool';
import { createRadiantFormEngine, FormController, schemaFormRegistrations } from '@schema-engine/forms-radiant';

/**
 * Offers the form it sits in to a browser agent while it is connected.
 *
 * @remarks
 * The controller finds the form through the host's ancestors and hands over its runtime now and each time the form
 * replaces it, so the tool is registered again for a new config. Without `autoSubmit` the agent fills the form and the
 * user sends it.
 */
class FeedbackAgentTool extends HTMLElement {
	readonly form = new FormController(this);

	private stop?: () => void;
	private unregister?: () => void;

	connectedCallback() {
		this.stop = this.form.watchRuntime((runtime) => {
			this.unregister?.();
			this.unregister = runtime
				? registerFormAgentTool(runtime, {
						name: 'send_feedback',
						description: 'Fill in the feedback form: the name of the sender and a comment.',
						formatIssue: (issue, field) => this.form.formatIssue(issue, field),
					})
				: undefined;
		});
	}

	disconnectedCallback() {
		this.stop?.();
		this.unregister?.();
	}
}

customElements.define('feedback-agent-tool', FeedbackAgentTool);

const AgentToolRegistration = defineStatic({
	$type: 'agentTool',
	schema: z.looseObject({ $type: z.literal('agentTool') }),
	metadata: { name: 'Agent tool', category: 'content' },
	render: () => <feedback-agent-tool />,
});

export const engine = createRadiantFormEngine({ elements: [...schemaFormRegistrations, AgentToolRegistration] });

export const feedback = engine.defineForm({
	id: 'feedback',
	steps: [
		{
			id: 'main',
			title: 'Feedback',
			elements: [
				{ $type: 'input', name: 'name', label: 'Name', rules: [{ $type: 'required' }] },
				{ $type: 'input', name: 'comment', label: 'Comment', description: 'What went well or badly' },
				{ $type: 'agentTool', id: 'agent-tool' },
				{ $type: 'submit', name: 'send', label: 'Send' },
			],
		},
	],
});
