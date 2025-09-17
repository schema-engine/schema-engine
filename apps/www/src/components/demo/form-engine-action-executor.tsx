import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { notificationPlugin, registerAction, resetPlugin, submitPlugin } from '@json-form-engine/core/actions/index';
import type { FormConfig } from '@json-form-engine/core/schemas';
import '@json-form-engine/react/components/form/registry';

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
					componentId: 'input',
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
					componentId: 'input',
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
					componentId: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					placeholder: 'Enter your message...',
					rules: [{ type: 'required', message: 'Message is required' }],
				},
				{
					componentId: 'checkbox',
					id: 'subscribe',
					name: 'subscribe',
					label: 'Subscribe to newsletter',
				},
			],
		},
	],
	actions: [
		{
			id: 'submit-contact',
			type: 'submit' as const,
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST' as const,
			successMessage: 'Contact form submitted successfully!',
			errorMessage: 'Failed to submit contact form.',
		},
		{
			id: 'notify-success',
			type: 'show_notification' as const,
			enabled: true,
			triggers: ['submit_success'],
			message: 'Contact form submitted successfully via FormEngine!',
			variant: 'success' as const,
			duration: 3000,
		},
		{
			id: 'notify-error',
			type: 'show_notification' as const,
			enabled: true,
			triggers: ['submit_error'],
			message: 'Failed to submit contact form via FormEngine.',
			variant: 'error' as const,
			duration: 5000,
		},
		{
			id: 'reset-form',
			type: 'reset' as const,
			enabled: true,
			triggers: ['submit_success'],
			resetToDefaults: true,
		},
	],
};

const FormEngineActionExecutor: React.FC = () => {
	const [executionLog, setExecutionLog] = React.useState<string[]>([]);

	React.useEffect(() => {
		const addToLog = (message: string) => {
			const timestamp = new Date().toLocaleTimeString();
			setExecutionLog((prev) => [...prev, `[${timestamp}] ${message}`]);
		};

		registerAction(
			submitPlugin({
				onSuccess: (data, context) => {
					console.log('🎉 FormEngine Submit Success:', { data, formId: context.formId });
					addToLog('✅ Submit plugin: Success callback executed');
					addToLog(`📊 Submitted data keys: [${Object.keys(data || {}).join(', ')}]`);
				},
				onError: (error, context) => {
					console.error('💥 FormEngine Submit Error:', { error, formId: context.formId });
					addToLog('❌ Submit plugin: Error callback executed');
					addToLog(`💥 Error: ${error instanceof Error ? error.message : String(error)}`);
				},
			}),
		);

		registerAction(
			resetPlugin({
				onReset: (context) => {
					console.log('🔄 FormEngine Form Reset:', { formId: context.formId });
					addToLog('🔄 Reset plugin: Form reset callback executed');
					addToLog('🧹 Form has been reset to default values');
				},
			}),
		);

		registerAction(
			notificationPlugin({
				onSuccess: (message, context) => {
					console.log('📢 FormEngine Success Notification:', message, { formId: context.formId });
					addToLog(`📢 Success notification displayed: "${message}"`);
				},
				onError: (message, context) => {
					console.error('📢 FormEngine Error Notification:', message, { formId: context.formId });
					addToLog(`📢 Error notification displayed: "${message}"`);
				},
			}),
		);
	}, []);

	const clearLog = () => setExecutionLog([]);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						🚀 FormEngine + Action System Demo
						<Badge variant="secondary">New Architecture</Badge>
					</CardTitle>
					<CardDescription>
						Demonstrates the integration of FormEngine with the new plugin-based action system. Actions are
						registered globally in the form registry.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid md:grid-cols-2 gap-6">
						{/* Form Section */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">Interactive Form</h3>
							<FormRenderer config={formConfigWithActions} />
						</div>

						{/* Execution Log Section */}
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

			{/* Technical Details */}
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
							<h4 className="font-medium mb-2">Registered Plugins</h4>
							<div className="space-y-2">
								<Badge variant="outline">submit - Global Submit Handler</Badge>
								<Badge variant="outline">notification - Global Notifications</Badge>
								<Badge variant="outline">reset - Global Form Reset</Badge>
								<Badge variant="outline">autoSave - Global Auto-save</Badge>
							</div>
							<p className="text-sm text-muted-foreground mt-2">
								Plugins are registered globally in the form registry and available to all FormEngine
								instances.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default FormEngineActionExecutor;
