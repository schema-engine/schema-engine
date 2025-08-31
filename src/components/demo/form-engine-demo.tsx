import { FormRenderer } from '../../lib/form-engine';
import { demoFormConfig } from '../../configs/forms/demo-forms';
// Import to register components
import '../form/registry';

/**
 * Demo component to test the form engine with JSON-based validation
 */
export function FormEngineDemo() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
			<div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
				<div className="absolute inset-0 bg-black/20"></div>
				<div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
						<svg
							className="w-8 h-8 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<h1 className="text-4xl md:text-5xl font-bold text-white mb-4">JSON-Based Form Engine</h1>
					<p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
						Build dynamic forms with serializable validation rules and auto-generated Zod schemas
					</p>

					{/* Feature Pills */}
					<div className="flex flex-wrap justify-center gap-3 mb-8">
						{[
							'Single Source of Truth',
							'Auto-Generated Schemas',
							'100% Serializable',
							'Real-time Validation',
						].map((feature, index) => (
							<span
								key={index}
								className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium"
							>
								{feature}
							</span>
						))}
					</div>
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-6 py-12">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
							<svg
								className="w-6 h-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h3 className="font-semibold text-gray-900 mb-2">Single Source of Truth</h3>
						<p className="text-gray-600 text-sm">
							Define validation rules once in JSON configuration. No duplicate schema definitions needed.
						</p>
					</div>

					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
							<svg
								className="w-6 h-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<h3 className="font-semibold text-gray-900 mb-2">Auto-Generated Schemas</h3>
						<p className="text-gray-600 text-sm">
							Zod validation schemas are automatically created from your JSON field configurations.
						</p>
					</div>

					<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
						<div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
							<svg
								className="w-6 h-6 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<h3 className="font-semibold text-gray-900 mb-2">100% Serializable</h3>
						<p className="text-gray-600 text-sm">
							Complete form configurations can be stored, transmitted, and edited as human-readable JSON.
						</p>
					</div>
				</div>

				<div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
					<div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
						<h2 className="text-2xl font-bold text-gray-900 mb-2">Interactive Demo</h2>
						<p className="text-gray-600">
							Try filling out this form to see real-time validation and error handling in action.
						</p>
					</div>

					<div className="p-8">
						<FormRenderer
							config={demoFormConfig}
							className="space-y-6"
							submitButtonClassName="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
						/>
					</div>
				</div>

				<div className="mt-12 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
					<div className="bg-gradient-to-r from-slate-50 to-gray-100 px-8 py-6 border-b border-gray-200">
						<h3 className="text-xl font-bold text-gray-900 mb-2">Configuration Preview</h3>
						<p className="text-gray-600">
							This is how the form is defined in JSON with embedded validation rules.
						</p>
					</div>

					<div className="p-8">
						<div className="bg-slate-900 rounded-xl p-6 overflow-x-auto">
							<pre className="text-sm text-slate-300 leading-relaxed">
								{JSON.stringify(
									{
										id: 'demo-form',
										autoGenerateSchema: true,
										fields: [
											{
												type: 'input',
												name: 'email',
												label: 'Email',
												validation: [{ type: 'email', message: 'Valid email required' }],
											},
											{
												type: 'number',
												name: 'age',
												validation: [
													{ type: 'min', value: 18, message: 'Must be 18+' },
													{ type: 'max', value: 120, message: 'Age must be realistic' },
												],
											},
										],
									},
									null,
									2,
								)}
							</pre>
						</div>
					</div>
				</div>

				<div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
						<h3 className="text-xl font-bold text-blue-900 mb-4">For Developers</h3>
						<ul className="space-y-3 text-blue-800">
							<li className="flex items-start gap-3">
								<div className="w-5 h-5 bg-blue-600 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
									<svg
										className="w-3 h-3 text-white"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<span>No more duplicate validation logic</span>
							</li>
							<li className="flex items-start gap-3">
								<div className="w-5 h-5 bg-blue-600 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
									<svg
										className="w-3 h-3 text-white"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<span>Type-safe configuration with TypeScript</span>
							</li>
							<li className="flex items-start gap-3">
								<div className="w-5 h-5 bg-blue-600 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
									<svg
										className="w-3 h-3 text-white"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<span>Extensible component registry system</span>
							</li>
						</ul>
					</div>

					<div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
						<h3 className="text-xl font-bold text-purple-900 mb-4">For Product Teams</h3>
						<ul className="space-y-3 text-purple-800">
							<li className="flex items-start gap-3">
								<div className="w-5 h-5 bg-purple-600 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
									<svg
										className="w-3 h-3 text-white"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<span>Forms can be configured via API</span>
							</li>
							<li className="flex items-start gap-3">
								<div className="w-5 h-5 bg-purple-600 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
									<svg
										className="w-3 h-3 text-white"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<span>Human-readable form configurations</span>
							</li>
							<li className="flex items-start gap-3">
								<div className="w-5 h-5 bg-purple-600 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
									<svg
										className="w-3 h-3 text-white"
										fill="currentColor"
										viewBox="0 0 20 20"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<span>Easy A/B testing and experimentation</span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	);
}
