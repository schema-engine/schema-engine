import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGDPRConsent, useGTMTracker } from '@schema-engine/forms-react/hooks';
import { actionsFormConfig, simpleActionsFormConfig } from '@/configs/forms/actions-forms';
import { FormRenderer } from '@schema-engine/forms-react/components/internals/form-renderer';
import '@/lib/form-engine-setup';

const onChange = (data: any) => {
	console.log('Form changed:', data);
};

const onAction = (action: any) => {
	console.log('Action executed:', action);
};

/**
 * Demo component showcasing the simplified action system
 */
export function ActionsDemo() {
	const [activeDemo, setActiveDemo] = useState<'simple' | 'enhanced'>('simple');
	const [submitResults, setSubmitResults] = useState<any[]>([]);

	const gdpr = useGDPRConsent();
	const gtm = useGTMTracker();

	const formConfig = activeDemo === 'simple' ? simpleActionsFormConfig : actionsFormConfig;

	const onSubmit = async (data: any) => {
		console.log('Form submitted:', data);
		setSubmitResults([data]);
	};

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<div className="text-center">
				<h1 className="text-3xl font-bold mb-2">Actions System Demo</h1>
				<p className="text-gray-600">Simplified action system with automatic execution based on triggers</p>
			</div>

			<div className="flex justify-center space-x-4">
				<Button
					variant={activeDemo === 'simple' ? 'default' : 'outline'}
					onClick={() => {
						setActiveDemo('simple');
						setSubmitResults([]);
					}}
				>
					Simple Demo
				</Button>
				<Button
					variant={activeDemo === 'enhanced' ? 'default' : 'outline'}
					onClick={() => {
						setActiveDemo('enhanced');
						setSubmitResults([]);
					}}
				>
					Enhanced Demo
				</Button>
			</div>

			{!gdpr.hasConsent() && (
				<Card className="border-blue-200 bg-blue-50">
					<CardContent className="pt-6">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium">Data Storage Consent</h3>
								<p className="text-sm text-gray-600">
									Allow auto-saving your form progress to improve your experience?
								</p>
							</div>
							<div className="space-x-2">
								<Button size="sm" variant="outline" onClick={gdpr.revokeConsent}>
									Decline
								</Button>
								<Button size="sm" onClick={gdpr.grantConsent}>
									Accept
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent className="pt-6">
					<FormRenderer config={formConfig} onSubmit={onSubmit} onChange={onChange} onAction={onAction} />
				</CardContent>
			</Card>

			{submitResults.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Action Results</CardTitle>
					</CardHeader>
					<CardContent>
						<pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
							{JSON.stringify(submitResults, null, 2)}
						</pre>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Debug Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h4 className="font-medium">GDPR Consent Status</h4>
						<p className="text-sm text-gray-600">Has Consent: {gdpr.hasConsent() ? 'Yes' : 'No'}</p>
					</div>
					<div>
						<h4 className="font-medium">GTM Status</h4>
						<p className="text-sm text-gray-600">Available: {gtm.isAvailable() ? 'Yes' : 'No'}</p>
					</div>
					<div>
						<h4 className="font-medium">Active Demo</h4>
						<p className="text-sm text-gray-600">Type: {activeDemo}</p>
					</div>
					<div>
						<h4 className="font-medium">Form Config</h4>
						<pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
							{JSON.stringify({ id: formConfig.id, steps: formConfig.steps.length }, null, 2)}
						</pre>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
