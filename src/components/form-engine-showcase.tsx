import { FormEngineProvider, FormRenderer } from '@/lib/form-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	basicFormConfig,
	conditionalFormConfig,
	arrayFormConfig,
	complexFormConfig,
} from '@/configs/forms/showcase-forms';

// Import only the needed registries for tree-shaking demonstration
import '@/components/form/fields/input-field.registry';
import '@/components/form/fields/select-field.registry';
import '@/components/form/fields/checkbox-field.registry';
import '@/components/form/fields/number-field.registry';
import '@/components/form/fields/array-field.registry';

/**
 * Complete showcase of all Form Engine features including:
 * 1. Tree-shakable field registry system
 * 2. Advanced conditional logic with useWatch
 * 3. Multi-element array fields
 * 4. Single-element array fields
 * 5. Complex conditional dependencies
 */
export function FormEngineShowcase() {
	const handleSubmit = (data: any) => {
		console.log('Form submitted:', data);
		alert('Form submitted successfully! Check the console for details.');
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="max-w-6xl mx-auto">
				<Card className="mb-8">
					<CardHeader>
						<CardTitle className="flex items-center gap-3">
							Form Engine Complete Showcase
							<Badge variant="secondary">Enhanced</Badge>
						</CardTitle>
						<CardDescription>
							Comprehensive demonstration of all Form Engine features including conditional logic, array
							fields, and tree-shakable architecture.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<div className="bg-green-50 p-4 rounded-lg border border-green-200">
								<h3 className="font-semibold text-green-900 mb-2">✅ Tree-Shakable Registry</h3>
								<p className="text-sm text-green-800">
									Only the imported field components are bundled, reducing your app's bundle size.
								</p>
							</div>
							<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
								<h3 className="font-semibold text-blue-900 mb-2">🔄 Conditional Logic</h3>
								<p className="text-sm text-blue-800">
									Advanced conditional rendering with useWatch for optimal performance and real-time
									updates.
								</p>
							</div>
							<div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
								<h3 className="font-semibold text-purple-900 mb-2">📋 Enhanced Arrays</h3>
								<p className="text-sm text-purple-800">
									Support for both single-element and multi-element array configurations.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Tabs defaultValue="basic" className="w-full">
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger id="basic-trigger" aria-controls="basic-content" value="basic">
							Basic Form
						</TabsTrigger>
						<TabsTrigger id="conditional-trigger" aria-controls="conditional-content" value="conditional">
							Conditional Logic
						</TabsTrigger>
						<TabsTrigger id="arrays-trigger" aria-controls="arrays-content" value="arrays">
							Array Fields
						</TabsTrigger>
						<TabsTrigger id="complex-trigger" aria-controls="complex-content" value="complex">
							Complex Example
						</TabsTrigger>
					</TabsList>

					<TabsContent id="basic-content" value="basic" className="space-y-4" aria-labelledby="basic-trigger">
						<Card>
							<CardHeader>
								<CardTitle>Basic Form Example</CardTitle>
								<CardDescription>
									Simple form demonstrating basic field types with validation.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FormEngineProvider>
									<FormRenderer config={basicFormConfig} onSubmit={handleSubmit} />
								</FormEngineProvider>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						id="conditional-content"
						value="conditional"
						className="space-y-4"
						aria-labelledby="conditional-trigger"
					>
						<Card>
							<CardHeader>
								<CardTitle>Conditional Logic Demo</CardTitle>
								<CardDescription>
									Fields that appear and disappear based on other field values using useWatch.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FormEngineProvider>
									<FormRenderer config={conditionalFormConfig} onSubmit={handleSubmit} />
								</FormEngineProvider>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						id="arrays-content"
						value="arrays"
						className="space-y-4"
						aria-labelledby="arrays-trigger"
					>
						<Card>
							<CardHeader>
								<CardTitle>Array Fields Demo</CardTitle>
								<CardDescription>
									Showcase of both single-element and multi-element array configurations.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FormEngineProvider>
									<FormRenderer config={arrayFormConfig} onSubmit={handleSubmit} />
								</FormEngineProvider>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						id="complex-content"
						value="complex"
						className="space-y-4"
						aria-labelledby="complex-trigger"
					>
						<Card>
							<CardHeader>
								<CardTitle>Complex Form Example</CardTitle>
								<CardDescription>
									Advanced form combining conditional logic, arrays, and multiple field dependencies.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<FormEngineProvider>
									<FormRenderer config={complexFormConfig} onSubmit={handleSubmit} />
								</FormEngineProvider>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
