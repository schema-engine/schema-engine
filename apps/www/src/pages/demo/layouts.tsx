import { FormEngineLayout } from '@/layouts/form-engine-layout';
import { FormRenderer } from '@schema-engine/forms-react/components/internals/form-renderer';
import type { FormConfig } from '@schema-engine/forms';
import '@/lib/form-engine-setup';

const cardLayoutDemo: FormConfig = {
	mode: 'free',
	id: 'card-layout-demo',
	title: 'Card Layout Demo',
	description: 'Testing the card layout system',

	steps: [
		{
			id: 'step1',
			title: 'Card Layout Test',

			layout: {
				$type: 'card',
				padding: 'lg',
			},

			elements: [
				{
					id: 'name',
					$type: 'input',
					inputType: 'text',
					name: 'name',
					label: 'Full Name',
					placeholder: 'Enter your name',
				},
				{
					id: 'email',
					$type: 'input',
					inputType: 'email',
					name: 'email',
					label: 'Email',
					placeholder: 'your.email@example.com',
				},
			],
		},
	],
};

const splitScreenLayoutDemo: FormConfig = {
	mode: 'free',
	id: 'split-layout-demo',
	title: 'Split Screen Layout Demo',
	description: 'Testing the split screen layout system',

	steps: [
		{
			id: 'step1',
			title: 'Split Screen Test',

			layout: {
				$type: 'split-screen',
			},

			elements: [
				{
					id: 'firstName',
					$type: 'input',
					inputType: 'text',
					name: 'firstName',
					label: 'First Name',
					placeholder: 'John',
				},
				{
					id: 'lastName',
					$type: 'input',
					inputType: 'text',
					name: 'lastName',
					label: 'Last Name',
					placeholder: 'Doe',
				},
				{
					id: 'bio',
					$type: 'textarea',
					name: 'bio',
					label: 'Biography',
					placeholder: 'Tell us about yourself...',
					rows: 4,
				},
			],
		},
	],
};

const heroLayoutDemo: FormConfig = {
	mode: 'free',
	id: 'hero-layout-demo',
	title: 'Hero Layout Demo',
	description: 'Testing the hero layout system',

	steps: [
		{
			id: 'step1',
			title: 'Hero Layout Test',

			layout: {
				$type: 'hero-background',
				contentWidth: 'md',
			},
			elements: [
				{
					id: 'message',
					$type: 'textarea',
					name: 'message',
					label: 'Your Message',
					placeholder: 'What would you like to say?',
					rows: 3,
				},
				{
					id: 'priority',
					$type: 'radio',
					name: 'priority',
					label: 'Priority Level',
					options: [
						{ value: 'low', label: 'Low Priority' },
						{ value: 'medium', label: 'Medium Priority' },
						{ value: 'high', label: 'High Priority' },
					],
					defaultValue: 'medium',
				},
			],
		},
	],
};

const simpleLayoutDemo: FormConfig = {
	mode: 'free',
	id: 'simple-layout-demo',
	title: 'Simple Layout Demo (No Custom Layout)',
	description: 'Basic form without custom layout - should work as fallback',

	steps: [
		{
			id: 'step1',
			title: 'Simple Form',

			elements: [
				{
					id: 'testField',
					$type: 'input',
					inputType: 'text',
					name: 'testField',
					label: 'Test Field',
					placeholder: 'This should always work',
				},
			],
		},
	],
};

export default function LayoutsPage() {
	return (
		<FormEngineLayout>
			<div className="min-h-screen bg-gray-50 py-12">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">Pure Layouts Demo</h1>
						<p className="text-xl text-gray-600 max-w-2xl mx-auto">
							Testing different layout systems in isolation to verify functionality
						</p>
					</div>

					<div className="space-y-12">
						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">
									1. Simple Layout (Baseline Test)
								</h2>
								<p className="text-gray-600">
									Basic form without custom layouts - this should always work
								</p>
							</div>
							<FormRenderer config={simpleLayoutDemo} />
						</div>

						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">2. Card Layout</h2>
								<p className="text-gray-600">Form with card-style layout using id: 'card'</p>
							</div>
							<FormRenderer config={cardLayoutDemo} />
						</div>

						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">3. Split Screen Layout</h2>
								<p className="text-gray-600">Form with split screen layout using id: 'split-screen' </p>
							</div>
							<FormRenderer config={splitScreenLayoutDemo} />
						</div>

						<div className="bg-white rounded-lg shadow-lg p-8">
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gray-900 mb-2">4. Hero Background Layout</h2>
								<p className="text-gray-600">
									Form with hero-style layout using id: 'hero-background'{' '}
								</p>
							</div>
							<FormRenderer config={heroLayoutDemo} />
						</div>
					</div>

					<div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
						<h3 className="text-lg font-semibold text-yellow-800 mb-3">Debug Information</h3>
						<div className="text-sm text-yellow-700 space-y-2">
							<p>
								<strong>Expected behavior:</strong>
							</p>
							<ul className="list-disc list-inside ml-4 space-y-1">
								<li>Simple layout should render normally (baseline)</li>
								<li>Card layout should have card styling and padding</li>
								<li>Split screen should show left/right layout</li>
								<li>Hero background layout should be centered with background styling</li>
							</ul>
							<p className="mt-3">
								<strong>If layouts don't work:</strong> Check browser console for errors and verify
								layout registry is loaded.
							</p>
						</div>
					</div>
				</div>
			</div>
		</FormEngineLayout>
	);
}
