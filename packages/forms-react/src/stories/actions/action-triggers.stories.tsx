import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useEffect } from 'react';
import { FormRenderer } from '@/components/internals/form-renderer';
import { FormEngineProvider } from '@/components/adapter-provider';
import { rhfAdapter } from '@/adapters/rhf';
import { createExtendableBuilder, ValidationPresets } from '@/stories/shared/form-builder.ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shadcn/ui/card';
import { Badge } from '@/shadcn/ui/badge';
import { Button } from '@/shadcn/ui/button';
import { ScrollArea } from '@/shadcn/ui/scroll-area';
import { StoryWrapper } from '@/stories/shared/story-wrapper';
import { SUBMIT_FORM_MOCK_URL, submitFormHandler } from '../msw/submit-form';
import { submitPlugin } from '@schema-engine/forms/actions';
import { z } from 'zod';
import type {
	BuilderActionExecutionContext,
	BuilderActionExecutionResult,
	BuilderActionRegistration,
} from '@schema-engine/forms/types';

/**
 * Action log entry for the dashboard
 */
interface ActionLogEntry {
	id: string;
	trigger: string;
	timestamp: Date;
	message: string;
	formData?: Record<string, any>;
	changedField?: string;
	changedValue?: any;
}

/**
 * Event Dispatcher for Action Logging
 *
 * Simple event emitter that allows plugins to dispatch events
 * and components to listen for them.
 */
class ActionEventDispatcher {
	private listeners: Array<(entry: Omit<ActionLogEntry, 'id'>) => void> = [];

	dispatch(logData: {
		trigger: string;
		message: string;
		timestamp: Date;
		formData?: Record<string, any>;
		changedField?: string;
		changedValue?: any;
	}) {
		for (const listener of this.listeners) {
			listener(logData);
		}
	}

	subscribe(listener: (entry: Omit<ActionLogEntry, 'id'>) => void) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	clear() {
		this.listeners = [];
	}
}

const actionEventDispatcher = new ActionEventDispatcher();

/**
 * Logger Action Schema
 * Defines the structure for event logger actions
 */
const LoggerActionSchema = z.object({
	id: z.string(),
	type: z.literal('event_logger'),
	description: z.string().optional(),
	enabled: z.boolean().default(true),
	triggers: z.array(z.string()).optional(),
});

type LoggerAction = z.infer<typeof LoggerActionSchema>;

/**
 * Logger Plugin - captures all action triggers and dispatches events
 *
 * This plugin executes on all form lifecycle events and dispatches them
 * through the event dispatcher.
 */
function loggerPlugin(dispatcher: ActionEventDispatcher): BuilderActionRegistration<LoggerAction> {
	let previousFormData: Record<string, any> = {};

	return {
		$type: 'event_logger',
		schema: LoggerActionSchema,
		metadata: {
			name: 'Event Logger',
			description: 'Logs action triggers for dashboard display',
			icon: 'activity',
			defaultTriggers: [
				'form_mount',
				'form_change',
				'form_submit',
				'form_submit_start',
				'form_submit_success',
				'form_submit_error',
				'form_submit_complete',
			],
		},
		execute: async (
			context: BuilderActionExecutionContext<LoggerAction>,
		): Promise<BuilderActionExecutionResult> => {
			const currentFormData = context.formData;
			const trigger = context.trigger;

			let changedField: string | undefined;
			let changedValue: any;

			if (trigger === 'form_change') {
				for (const key in currentFormData) {
					if (currentFormData[key] !== previousFormData[key]) {
						changedField = key;
						changedValue = currentFormData[key];
						break;
					}
				}
			}

			const message =
				trigger === 'form_change' && changedField
					? `Event: ${trigger} (${changedField}: ${JSON.stringify(changedValue)})`
					: `Event: ${trigger}`;

			dispatcher.dispatch({
				trigger,
				message,
				timestamp: new Date(),
				formData: currentFormData,
				changedField,
				changedValue,
			});

			previousFormData = { ...currentFormData };

			return {
				success: true,
				message: 'Logged event',
				shouldContinue: true,
			};
		},
	};
}

/**
 * Custom submit plugin that dispatches events to the dashboard
 */
const customSubmitPlugin = submitPlugin({
	onError(error, context) {
		console.error('Submit action error', { error, context });
	},
	onSuccess(data, context) {
		console.log('Submit action success', { data, context });
	},
});

/**
 * Build the engine with logger and submit plugins
 */
const customLoggerPlugin = loggerPlugin(actionEventDispatcher);
const demoEngine = createExtendableBuilder().addAction(customLoggerPlugin).addAction(customSubmitPlugin).build();

/**
 * Form configuration for the demo
 */
const demoFormConfig = createExtendableBuilder()
	.addAction(customLoggerPlugin)
	.addAction(customSubmitPlugin)
	.createForm()
	.setId('action-demo-form')
	.setTitle('Action Triggers Demo')
	.setDescription('Interact with the form to see actions trigger in real-time')
	.addStep({
		id: 'demo',
		title: 'Demo',
	})
	.addElement('input', {
		id: 'name',
		name: 'name',
		label: 'Name',
		placeholder: 'Type to trigger form_change',
		inputType: 'text',
		rules: [ValidationPresets.string.required('Name is required')],
	})
	.addElement('input', {
		id: 'email',
		name: 'email',
		label: 'Email',
		placeholder: 'Enter your email',
		inputType: 'email',
		rules: [ValidationPresets.string.email('Valid email required')],
	})
	.addElement('checkbox', {
		id: 'subscribe',
		name: 'subscribe',
		label: 'Subscribe to newsletter',
	})
	.addElement('submit', {
		id: 'submit',
		name: 'submit',
		label: 'Submit Form',
	})
	.addFormAction(
		'submit' as any,
		{
			id: 'submit-action',
			type: 'submit',
			enabled: true,
			endpoint: SUBMIT_FORM_MOCK_URL,
			method: 'POST',
		} as any,
	)
	.addFormAction(
		'event_logger' as any,
		{
			id: 'log-all-events',
			type: 'event_logger',
			enabled: true,
			triggers: [
				'form_mount',
				'form_change',
				'form_submit',
				'form_submit_start',
				'form_submit_success',
				'form_submit_error',
				'form_submit_complete',
			],
		} as any,
	)
	.build();

const simpleEngine = createExtendableBuilder().build();

/**
 * Action Dashboard Component
 *
 * Displays real-time action logs in two views:
 * 1. Chronological log of all actions
 * 2. Grouped view by trigger type
 */
const ActionDashboard = ({ logs }: { logs: ActionLogEntry[] }) => {
	const getTriggerColor = (trigger: string) => {
		if (trigger.includes('submit')) return 'bg-blue-500';
		if (trigger === 'form_mount') return 'bg-green-500';
		if (trigger === 'form_change') return 'bg-yellow-500';
		return 'bg-gray-500';
	};

	const groupedLogs = logs.reduce(
		(acc, log) => {
			if (!acc[log.trigger]) {
				acc[log.trigger] = [];
			}
			acc[log.trigger].push(log);
			return acc;
		},
		{} as Record<string, ActionLogEntry[]>,
	);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Real-Time Action Log</CardTitle>
					<CardDescription>All actions executed in chronological order ({logs.length} total)</CardDescription>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-[400px] w-full">
						<div className="space-y-2">
							{logs.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No actions executed yet. Type in the form or submit to see actions trigger.
								</p>
							) : (
								logs.map((log) => (
									<div
										key={log.id}
										className="flex items-start gap-2 p-2 rounded-lg border bg-card text-card-foreground"
									>
										<Badge className={getTriggerColor(log.trigger)} variant="default">
											{log.trigger}
										</Badge>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium">{log.message}</p>
											{log.changedField && (
												<p className="text-xs text-muted-foreground mt-1">
													<span className="font-semibold">{log.changedField}:</span>{' '}
													{JSON.stringify(log.changedValue)}
												</p>
											)}
											<p className="text-xs text-muted-foreground">
												{log.timestamp.toLocaleTimeString()}
											</p>
										</div>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Events by Trigger</CardTitle>
					<CardDescription>Grouped view of all trigger types</CardDescription>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-[400px] w-full">
						<div className="space-y-4">
							{Object.keys(groupedLogs).length === 0 ? (
								<p className="text-sm text-muted-foreground">No triggers fired yet</p>
							) : (
								Object.entries(groupedLogs).map(([trigger, triggerLogs]) => (
									<div key={trigger} className="space-y-2">
										<div className="flex items-center gap-2">
											<Badge className={getTriggerColor(trigger)} variant="default">
												{trigger}
											</Badge>
											<span className="text-sm text-muted-foreground">
												({triggerLogs.length} times)
											</span>
										</div>
										<div className="pl-4 space-y-1">
											{triggerLogs.map((log) => (
												<p key={log.id} className="text-xs text-muted-foreground">
													{log.message} at {log.timestamp.toLocaleTimeString()}
												</p>
											))}
										</div>
									</div>
								))
							)}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
};

/**
 * Interactive Action Demo Component
 *
 * Renders a form with the logger plugin attached and displays the action dashboard.
 * Users can interact with the form to see actions trigger in real-time.
 */
const InteractiveActionDemo = () => {
	const [logs, setLogs] = useState<ActionLogEntry[]>([]);
	const [formKey, setFormKey] = useState(0);

	useEffect(() => {
		const unsubscribe = actionEventDispatcher.subscribe((logData) => {
			const entry: ActionLogEntry = {
				id: `${Date.now()}-${Math.random()}`,
				...logData,
			};
			setLogs((prev) => [entry, ...prev]);
		});

		return () => {
			unsubscribe();
		};
	}, []);

	const clearLogs = () => {
		setLogs([]);
	};

	const resetForm = () => {
		setFormKey((prev) => prev + 1);
		clearLogs();
	};

	return (
		<FormEngineProvider engine={demoEngine} adapter={rhfAdapter}>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold">Action Triggers Interactive Demo</h2>
						<p className="text-muted-foreground">
							Watch all action triggers fire in real-time as you interact with the form
						</p>
					</div>
					<div className="flex gap-2">
						<Button onClick={clearLogs} variant="outline" size="sm">
							Clear Logs
						</Button>
						<Button onClick={resetForm} variant="outline" size="sm">
							Reset Form
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<Card>
							<CardHeader>
								<CardTitle>Interactive Form</CardTitle>
								<CardDescription>Fill out the form to trigger actions</CardDescription>
							</CardHeader>
							<CardContent>
								<FormRenderer key={formKey} config={demoFormConfig} />
							</CardContent>
						</Card>

						<Card className="mt-4">
							<CardHeader>
								<CardTitle>Available Triggers</CardTitle>
								<CardDescription>Events that can trigger actions</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="space-y-2 text-sm">
									<li className="flex items-center gap-2">
										<Badge className="bg-green-500">form_mount</Badge>
										<span>Fires when form initializes</span>
									</li>
									<li className="flex items-center gap-2">
										<Badge className="bg-yellow-500">form_change</Badge>
										<span>Fires when any field value changes</span>
									</li>
									<li className="flex items-center gap-2">
										<Badge className="bg-blue-500">form_submit</Badge>
										<span>Fires when form submission is initiated</span>
									</li>
									<li className="flex items-center gap-2">
										<Badge className="bg-blue-500">form_submit_start</Badge>
										<span>Fires when submit process begins</span>
									</li>
									<li className="flex items-center gap-2">
										<Badge className="bg-blue-500">form_submit_success</Badge>
										<span>Fires when submission succeeds</span>
									</li>
									<li className="flex items-center gap-2">
										<Badge className="bg-blue-500">form_submit_error</Badge>
										<span>Fires when submission fails</span>
									</li>
									<li className="flex items-center gap-2">
										<Badge className="bg-blue-500">form_submit_complete</Badge>
										<span>Fires when submission completes (success or error)</span>
									</li>
								</ul>
							</CardContent>
						</Card>
					</div>

					<div>
						<ActionDashboard logs={logs} />
					</div>
				</div>
			</div>
		</FormEngineProvider>
	);
};

const meta = {
	title: 'Actions/Action Triggers',
	component: FormRenderer,
	parameters: {
		layout: 'padded',
		msw: {
			handlers: [submitFormHandler],
		},
	},
	decorators: [
		(Story) => (
			<StoryWrapper engine={simpleEngine}>
				<Story />
			</StoryWrapper>
		),
	],
	tags: ['autodocs'],
} satisfies Meta<typeof FormRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Real-time dashboard story showing all action triggers
 */
export const RealtimeDashboard: Story = {
	args: {
		config: createExtendableBuilder().createForm().setId('dummy').addStep({ id: 's1', title: 'S1' }).build(),
	},
	render: () => <InteractiveActionDemo />,
};
