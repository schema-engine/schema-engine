import { FormRenderer } from '@/lib/form-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { conditionalFormConfig } from '@/configs/forms/conditional-forms';
import '@/lib/form-engine/components/form/registry';

/**
 * This demo showcases the form engine's advanced conditional logic capabilities:
 * 1. Complex field visibility based on multiple conditions
 * 2. Multiple conditional logic rules per field
 * 3. Array fields with multiple element types
 * 4. Tree-shakable field registry system
 */
export function ConditionalFormDemo() {
	const handleSubmit = (data: any) => {
		console.log('Form submitted:', data);
		alert('Form submitted successfully! Check the console for details.');
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="max-w-4xl mx-auto">
				<Card>
					<CardHeader>
						<CardTitle>Advanced Form Engine Demo</CardTitle>
						<CardDescription>
							This demo showcases the Form Engine's advanced features including conditional field
							rendering, multiple conditional logic rules, and array fields with both single and multiple
							element types.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
								<h3 className="font-semibold text-blue-900 mb-2">Features Demonstrated:</h3>
								<ul className="text-sm text-blue-800 space-y-1">
									<li>
										• <strong>Conditional Rendering:</strong> Fields appear/disappear based on other
										field values
									</li>
									<li>
										• <strong>useWatch Integration:</strong> Efficient React Hook Form integration
										for real-time updates
									</li>
									<li>
										• <strong>Multiple Constraints:</strong> Fields can have multiple conditional
										logic rules (AND/OR combinations)
									</li>
									<li>
										• <strong>Array Fields:</strong> Dynamic array fields with add/remove
										functionality and configurable constraints
									</li>
									<li>
										• <strong>Tree-shakable Registry:</strong> Only required field types are bundled
										in the final build
									</li>
								</ul>
							</div>

							<FormRenderer config={conditionalFormConfig} onSubmit={handleSubmit} />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
