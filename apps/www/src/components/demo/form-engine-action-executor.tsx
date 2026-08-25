import { useState, useMemo, type FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormEngineProvider, FormRenderer, rhfAdapter } from '@schema-engine/forms-react';
import { formEngine } from '@/lib/form-engine-setup';
import { formSubmitPlugin, notificationPlugin, formResetPlugin } from '@schema-engine/forms/actions';
import type { FormConfig } from '@schema-engine/forms/schemas';

const formConfigWithActions: FormConfig = {
	id: 'form-engine-demo',
	title: 'FormEngine + Action Executor Demo',
	description: 'This uses the actual FormEngine with integrated action system',
	mode: 'wizard' as const,
	steps: [
		{
			id: 'demo-step',
			title: 'Contact Form',
			description: 'Fill out the form below to see the action system in action',
			elements: [
				{
					$type: 'input',
					inputType: 'text',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your full name',
					rules: [
						{ type: 'required', message: 'Name is required' },
						{ type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
					],
				},
				{
					$type: 'input',
					inputType: 'email',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Please enter a valid email address' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					placeholder: 'Enter your message...',
					rules: [{ type: 'required', message: 'Message is required' }],
				},
				{
					$type: 'checkbox',
					id: 'subscribe',
					name: 'subscribe',
					label: 'Subscribe to newsletter',
				},
				{
					$type: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
	actions: [
		{
			id: 'submit-contact',
			$type: 'submit' as const,
			enabled: true,
			triggers: ['form_submit'],
			endpoint: '/api/submit-demo',
			method: 'POST' as const,
			successMessage: 'Contact form submitted successfully!',
			errorMessage: 'Failed to submit contact form.',
		},
		{
			id: 'notify-success',
			$type: 'show_notification' as const,
			enabled: true,
			triggers: ['form_submit_success'],
			message: 'Contact form submitted successfully via FormEngine!',
			variant: 'success' as const,
			duration: 3000,
		},
		{
			id: 'notify-error',
			$type: 'show_notification' as const,
			enabled: true,
			triggers: ['form_submit_error'],
			message: 'Failed to submit contact form via FormEngine.',
			variant: 'error' as const,
			duration: 5000,
		},
		{
			id: 'reset-form',
			$type: 'reset' as const,
			enabled: true,
			triggers: ['form_submit_success'],
			resetToDefaults: true,
		},
	],
};

const FormEngineActionExecutor: FC = () => {
	const [executionLog, setExecutionLog] = useState<string[]>([
		'[info] Actions are pre-configured in the global formEngine instance',
		'[info] Submit your form to see the action system in action',
	]);

	const clearLog = () => setExecutionLog([]);

	const customFormEngine = useMemo(() => {
		const addLog = (message: string) => {
			setExecutionLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
		};

		return formEngine
			.toComposer()
			.addAction(
				formSubmitPlugin({
					onSuccess: (data, context) => {
						addLog(`✅ Form submitted successfully: ${context.formId}`);
						addLog(`[data] ${JSON.stringify(data, null, 2)}`);
					},
					onError: (error, context) => {
						addLog(`❌ Form submission failed: ${context.formId}`);
						addLog(`[error] ${error.message}`);
					},
				}),
			)
			.addAction(
				notificationPlugin({
					onSuccess: (message) => {
						addLog(`[notification] ✅ ${message}`);
					},
					onError: (message) => {
						addLog(`[notification] ❌ ${message}`);
					},
					onWarning: (message) => {
						addLog(`[notification] ⚠️ ${message}`);
					},
					onInfo: (message) => {
						addLog(`[notification] ℹ️ ${message}`);
					},
				}),
			)
			.addAction(
				formResetPlugin({
					onReset: (context) => {
						addLog(`🔄 Form reset: ${context.formId}`);
					},
				}),
			)
			.build();
	}, []);

	return (
		<FormEngineProvider engine={customFormEngine} adapter={rhfAdapter}>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							FormEngine + Action System Demo
							<Badge variant="secondary">Extended Actions</Badge>
						</CardTitle>
						<CardDescription>
							Demonstrates extending the base FormEngine with custom action handlers. This demo uses the
							extend() method to override default actions with custom logging implementations.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-4">
								<h3 className="text-lg font-semibold">Interactive Form</h3>
								<FormRenderer config={formConfigWithActions} />
							</div>

							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold">Action Execution Log</h3>
									<Button variant="outline" size="sm" onClick={clearLog}>
										Clear Log
									</Button>
								</div>
								<div className="border rounded-lg p-4 h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900">
									{executionLog.length === 0 ? (
										<p className="text-muted-foreground text-sm">
											Submit or reset the form to see action execution logs...
										</p>
									) : (
										<div className="space-y-1">
											{executionLog.map((log, index) => (
												<div key={index} className="text-xs font-mono">
													{log}
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>🔧 Technical Implementation</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid md:grid-cols-2 gap-6">
							<div>
								<h4 className="font-medium mb-2">Action Configuration</h4>
								<pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto">
									{JSON.stringify(formConfigWithActions.actions, null, 2)}
								</pre>
							</div>
							<div>
								<h4 className="font-medium mb-2">Extended Action Plugins</h4>
								<div className="space-y-2">
									<Badge variant="outline">submit - Custom Logger</Badge>
									<Badge variant="outline">notification - Custom Logger</Badge>
									<Badge variant="outline">reset - Custom Logger</Badge>
								</div>
								<p className="text-sm text-muted-foreground mt-2">
									This demo extends the base formEngine instance using the toComposer() method,
									overriding the default action handlers with custom implementations that log
									execution details.
								</p>
								<pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto mt-3">
									{`formEngine.toComposer()
  .addAction(submitPlugin({ ... }))
  .addAction(notificationPlugin({ ... }))
  .addAction(resetPlugin({ ... }))
  .build()`}
								</pre>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</FormEngineProvider>
	);
};

export default FormEngineActionExecutor;
