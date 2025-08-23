import '@/components/form/registries';
import { FormRenderer, FormEngineProvider } from '@/lib/form-engine';
import { FormEngineLayout } from '@/layouts/form-engine-layout';
import {
	multiStepRegistrationConfig,
	verticalStepperConfig,
	minimalStepperConfig,
} from '@/configs/forms/multi-step-forms';

export default function MultiStepFormsPage() {
	return (
		<FormEngineProvider>
			<FormEngineLayout>
				<div className="min-h-screen bg-gray-50 py-12">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-gray-900 mb-4">Multi-Step Forms (New API)</h1>
							<p className="text-xl text-gray-600 max-w-2xl mx-auto">
								Experience our enhanced multi-step form engine with centralized configurations,
								step-based field organization, and wizard mode validation.
							</p>
						</div>

						<div className="space-y-16">
							{/* Default Multi-Step Form */}
							<div className="bg-white rounded-lg shadow-lg p-8">
								<div className="mb-8">
									<h2 className="text-2xl font-bold text-gray-900 mb-2">
										Registration Form (Wizard Mode)
									</h2>
									<p className="text-gray-600">
										A comprehensive registration form with strict step-by-step validation. Fields
										are organized within each step for better structure and styling control.
									</p>
								</div>
								<FormRenderer config={multiStepRegistrationConfig} />
							</div>

							{/* Vertical Stepper Variant */}
							<div className="bg-white rounded-lg shadow-lg p-8">
								<div className="mb-8">
									<h2 className="text-2xl font-bold text-gray-900 mb-2">Vertical Stepper</h2>
									<p className="text-gray-600">
										Same registration form with a vertical stepper layout. Perfect for
										mobile-friendly experiences.
									</p>
								</div>
								<FormRenderer config={verticalStepperConfig} />
							</div>

							{/* Minimal Stepper Variant */}
							<div className="bg-white rounded-lg shadow-lg p-8">
								<div className="mb-8">
									<h2 className="text-2xl font-bold text-gray-900 mb-2">
										Minimal Stepper (Free Mode)
									</h2>
									<p className="text-gray-600">
										Simplified stepper design with free navigation mode. Users can jump between
										steps without validation constraints.
									</p>
								</div>
								<FormRenderer config={minimalStepperConfig} />
							</div>
						</div>

						{/* Features Information */}
						<div className="mt-16 bg-white rounded-lg shadow-lg p-8">
							<h2 className="text-2xl font-bold text-gray-900 mb-6">New API Features</h2>
							<div className="grid md:grid-cols-2 gap-8">
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-3">
										Centralized Configuration
									</h3>
									<ul className="space-y-2 text-gray-600">
										<li>• All form configs stored in /src/configs/forms/</li>
										<li>• Better organization and reusability</li>
										<li>• Import and use across components</li>
										<li>• Version control friendly structure</li>
									</ul>
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-3">Step-Based Fields</h3>
									<ul className="space-y-2 text-gray-600">
										<li>• Fields organized directly within steps</li>
										<li>• No more step property on individual fields</li>
										<li>• Better styling and layout control</li>
										<li>• Cleaner step navigation logic</li>
									</ul>
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-3">Mode Property</h3>
									<ul className="space-y-2 text-gray-600">
										<li>• 'wizard' mode for strict validation</li>
										<li>• 'free' mode for flexible navigation</li>
										<li>• Default to 'wizard' mode</li>
										<li>• Clear and intuitive naming</li>
									</ul>
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900 mb-3">Button Variants</h3>
									<ul className="space-y-2 text-gray-600">
										<li>• Direct variant usage on buttons</li>
										<li>• No more helper function complexity</li>
										<li>• Clean button configuration</li>
										<li>• Consistent with shadcn/ui patterns</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			</FormEngineLayout>
		</FormEngineProvider>
	);
}
