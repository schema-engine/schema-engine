import { FormRenderer } from '@/lib/form-engine';
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
interface TabConfig {
	id: string;
	label: string;
	title: string;
	description: string;
	config: any;
}

interface FeatureHighlight {
	bgColor: string;
	borderColor: string;
	titleColor: string;
	textColor: string;
	icon: string;
	title: string;
	description: string;
}

export function FormEngineShowcase() {
	const handleSubmit = (data: any) => {
		console.log('Form submitted:', data);
		alert('Form submitted successfully! Check the console for details.');
	};

	const tabs: TabConfig[] = [
		{
			id: 'basic',
			label: 'Basic Form',
			title: 'Basic Form Example',
			description: 'Simple form demonstrating basic field types with validation.',
			config: basicFormConfig,
		},
		{
			id: 'conditional',
			label: 'Conditional Logic',
			title: 'Conditional Logic Demo',
			description: 'Fields that appear and disappear based on other field values using useWatch.',
			config: conditionalFormConfig,
		},
		{
			id: 'arrays',
			label: 'Array Fields',
			title: 'Array Fields Demo',
			description: 'Showcase of both single-element and multi-element array configurations.',
			config: arrayFormConfig,
		},
		{
			id: 'complex',
			label: 'Complex Example',
			title: 'Complex Form Example',
			description: 'Advanced form combining conditional logic, arrays, and multiple field dependencies.',
			config: complexFormConfig,
		},
	];

	const features: FeatureHighlight[] = [
		{
			bgColor: 'bg-green-50',
			borderColor: 'border-green-200',
			titleColor: 'text-green-900',
			textColor: 'text-green-800',
			icon: '✅',
			title: 'Tree-Shakable Registry',
			description: "Only the imported field components are bundled, reducing your app's bundle size.",
		},
		{
			bgColor: 'bg-blue-50',
			borderColor: 'border-blue-200',
			titleColor: 'text-blue-900',
			textColor: 'text-blue-800',
			icon: '🔄',
			title: 'Conditional Logic',
			description: 'Advanced conditional rendering with useWatch for optimal performance and real-time updates.',
		},
		{
			bgColor: 'bg-purple-50',
			borderColor: 'border-purple-200',
			titleColor: 'text-purple-900',
			textColor: 'text-purple-800',
			icon: '📋',
			title: 'Enhanced Arrays',
			description: 'Support for both single-element and multi-element array configurations.',
		},
	];

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
							{features.map((feature, index) => (
								<div
									key={index}
									className={`${feature.bgColor} p-4 rounded-lg border ${feature.borderColor}`}
								>
									<h3 className={`font-semibold ${feature.titleColor} mb-2`}>
										{feature.icon} {feature.title}
									</h3>
									<p className={`text-sm ${feature.textColor}`}>{feature.description}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Tabs defaultValue={tabs[0].id} className="w-full">
					<TabsList className={`grid w-full grid-cols-${tabs.length}`}>
						{tabs.map((tab) => (
							<TabsTrigger
								key={tab.id}
								id={`${tab.id}-trigger`}
								aria-controls={`${tab.id}-content`}
								value={tab.id}
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

					{tabs.map((tab) => (
						<TabsContent
							key={tab.id}
							id={`${tab.id}-content`}
							value={tab.id}
							className="space-y-4"
							aria-labelledby={`${tab.id}-trigger`}
						>
							<Card>
								<CardHeader>
									<CardTitle>{tab.title}</CardTitle>
									<CardDescription>{tab.description}</CardDescription>
								</CardHeader>
								<CardContent>
									<FormRenderer config={tab.config} onSubmit={handleSubmit} />
								</CardContent>
							</Card>
						</TabsContent>
					))}
				</Tabs>
			</div>
		</div>
	);
}
