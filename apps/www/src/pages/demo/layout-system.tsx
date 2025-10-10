import { FormEngineLayout } from '@/layouts/form-engine-layout';
import { conceptStepLayoutDemo, currentGridSystemDemo } from '@/configs/forms/layout-concept-demo';
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';

export default function LayoutSystemDemoPage() {
	return (
		<FormEngineLayout>
			<div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
							Layout & Stepper System Demo
						</h1>
						<p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
							Explore our three-layer layout architecture: CSS Grid positioning, Step layouts, and Stepper
							UI components
						</p>
					</div>

					<div className="grid lg:grid-cols-2 gap-8 mb-12">
						<div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
							<div className="mb-6">
								<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
									Step Layout Concept
								</h2>
								<p className="text-gray-600 dark:text-gray-300">
									Future implementation will allow custom layouts per step
								</p>
							</div>

							<div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
								<FormRenderer config={conceptStepLayoutDemo} />
							</div>
						</div>

						<div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
							<div className="mb-6">
								<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
									Current CSS Grid System
								</h2>
								<p className="text-gray-600 dark:text-gray-300">
									Responsive grid positioning (working today)
								</p>
							</div>

							<div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
								<FormRenderer config={currentGridSystemDemo} />
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
						<h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
							Layout System Architecture
						</h2>

						<div className="grid md:grid-cols-3 gap-6">
							<div className="p-4 border border-green-200 dark:border-green-700 rounded-lg">
								<div className="flex items-center mb-3">
									<div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
									<h3 className="font-medium text-gray-900 dark:text-white">CSS Grid Layout</h3>
								</div>
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Purpose:</strong> Element positioning within steps
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Status:</strong> ✅ Working today
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									<strong>Usage:</strong>{' '}
									<code className="text-xs">
										element.grid = &#123;responsive: &#123;...&#125;&#125;
									</code>
								</p>
							</div>

							<div className="p-4 border border-blue-200 dark:border-blue-700 rounded-lg">
								<div className="flex items-center mb-3">
									<div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
									<h3 className="font-medium text-gray-900 dark:text-white">Step Layouts</h3>
								</div>
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Purpose:</strong> Step wrapper components (card, split-screen)
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Status:</strong> 🔄 In development
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									<strong>Usage:</strong>{' '}
									<code className="text-xs">step.layout = &#123;layoutId: 'card'&#125;</code>
								</p>
							</div>

							<div className="p-4 border border-purple-200 dark:border-purple-700 rounded-lg">
								<div className="flex items-center mb-3">
									<div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
									<h3 className="font-medium text-gray-900 dark:text-white">Stepper UI</h3>
								</div>
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Purpose:</strong> Navigation UI customization
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
									<strong>Status:</strong> 🔄 In development
								</p>
								<p className="text-sm text-gray-600 dark:text-gray-300">
									<strong>Usage:</strong>{' '}
									<code className="text-xs">
										form.stepper = &#123;stepperId: 'progress-bar'&#125;
									</code>
								</p>
							</div>
						</div>

						<div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
							<h4 className="font-medium text-amber-900 dark:text-amber-200 mb-2">🗑️ Cleanup Note</h4>
							<p className="text-sm text-amber-800 dark:text-amber-300">
								The old <code>LayoutConfig</code> system (for tabs/accordions) was unused and has been
								removed to avoid confusion. We now have clean separation: Grid (positioning), Step
								Layouts (wrappers), and Steppers (navigation).
							</p>
						</div>
					</div>
				</div>
			</div>
		</FormEngineLayout>
	);
}
