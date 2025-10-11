import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { FormEngineProvider } from '@json-form-engine/react/components/adapter-provider';
import { rhfAdapter } from '@json-form-engine/react/adapters/rhf';
import { formEngine } from '@/lib/form-engine-setup';
import '@/lib/form-engine-setup';
import { constraintsDemoConfig } from '@/configs/forms/constraints-forms';

/**
 * Comprehensive demo component showcasing all the new features
 */
export function ConstraintsDemo() {
	const handleSubmit = (data: any) => {
		console.log('Form submitted:', data);
		alert('Form submitted! Check console for data.');
	};

	const handleChange = (data: any) => {
		console.log('Form changed:', data);
	};

	return (
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<div className="max-w-4xl mx-auto p-6 space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 mb-4">Form Engine v2.0 - Constraints Demo</h1>
					<p className="text-lg text-gray-600 mb-8">
						Showcasing the new constraint-based conditional logic, enhanced array fields, and tree-shakable
						registry system.
					</p>
				</div>

				<div className="bg-white shadow-lg rounded-lg p-6">
					<FormRenderer
						config={constraintsDemoConfig}
						onSubmit={handleSubmit}
						onChange={handleChange}
						className="space-y-6"
					/>
				</div>

				<div className="bg-gray-50 rounded-lg p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-4">✨ New Features Demonstrated</h2>

					<div className="grid md:grid-cols-2 gap-6">
						<div>
							<h3 className="font-medium text-gray-900 mb-2">🎯 Constraint-Based Logic</h3>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• Fields show/hide based on user type selection</li>
								<li>• Dynamic required field validation</li>
								<li>• Conditional enable/disable behavior</li>
								<li>• Multiple constraint operators supported</li>
							</ul>
						</div>

						<div>
							<h3 className="font-medium text-gray-900 mb-2">🔄 Enhanced Array Fields</h3>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• Multi-element array entries</li>
								<li>• Programming language + proficiency pairs</li>
								<li>• Dynamic add/remove functionality</li>
								<li>• Conditional array field display</li>
							</ul>
						</div>

						<div>
							<h3 className="font-medium text-gray-900 mb-2">🌳 Tree-Shakable Registry</h3>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• Registry files alongside components</li>
								<li>• Selective field type imports</li>
								<li>• Optimized bundle sizes</li>
								<li>• Auto-registration on import</li>
							</ul>
						</div>

						<div>
							<h3 className="font-medium text-gray-900 mb-2">🏗️ Better Architecture</h3>
							<ul className="text-sm text-gray-600 space-y-1">
								<li>• useWatch for efficient field observation</li>
								<li>• Proper JSDoc documentation</li>
								<li>• Removed inline comments</li>
								<li>• Consistent naming conventions</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</FormEngineProvider>
	);
}
