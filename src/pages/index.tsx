import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';
import { FormEngineLayout } from '@/layouts/form-engine-layout';

const FormEngine: EcoComponent<unknown, JSX.Element> = () => {
	const features = [
		{
			title: 'JSON-Driven Configuration',
			description: 'Define forms entirely in JSON with automatic validation generation',
			icon: '📝',
			highlight: 'Serializable',
		},
		{
			title: 'Responsive Grid System',
			description: 'Advanced layout system with device emulation and breakpoint management',
			icon: '📱',
			highlight: 'Adaptive',
		},
		{
			title: 'Conditional Logic',
			description: 'Dynamic field rendering based on real-time form state',
			icon: '🔀',
			highlight: 'Smart',
		},
		{
			title: 'Array Fields',
			description: 'Single and multi-element array configurations with validation',
			icon: '📋',
			highlight: 'Flexible',
		},
		{
			title: 'Tree-Shakable Registry',
			description: 'Modular field components loaded only when needed',
			icon: '🌳',
			highlight: 'Optimized',
		},
		{
			title: 'Auto-Generated Schemas',
			description: 'Zod validation schemas created automatically from configuration',
			icon: '⚡',
			highlight: 'Automated',
		},
	];

	const demoPages = [
		{
			title: 'Basic Demo',
			description: 'Start with the fundamentals of JSON-based form validation',
			path: '/basic-demo',
			icon: '🚀',
			level: 'Beginner',
		},
		{
			title: 'Multi-Step Forms',
			description: 'Composable stepper with horizontal, vertical, and minimal layouts',
			path: '/multi-step-forms',
			icon: '📋',
			level: 'Intermediate',
		},
		{
			title: 'Responsive Grid',
			description: 'Explore adaptive layouts and device emulation',
			path: '/responsive-grid',
			icon: '📐',
			level: 'Intermediate',
		},
		{
			title: 'JSON Builder',
			description: 'Interactive form configuration editor and live preview',
			path: '/json-builder',
			icon: '🛠️',
			level: 'Intermediate',
		},
		{
			title: 'Complete Showcase',
			description: 'Comprehensive demonstration of all features',
			path: '/showcase',
			icon: '🎯',
			level: 'Advanced',
		},
		{
			title: 'Conditional Forms',
			description: 'Dynamic field rendering and complex logic',
			path: '/conditional-forms',
			icon: '🧩',
			level: 'Advanced',
		},
		{
			title: 'Actions System',
			description: 'Serializable actions with form submission, navigation, tracking and custom handlers',
			path: '/actions',
			icon: '⚡',
			level: 'Advanced',
		},
	];

	return (
		<FormEngineLayout className="container mx-auto px-6 py-8 max-w-7xl">
			<div className="text-center mb-12">
				<div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
					<svg
						className="w-10 h-10 text-white"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-label="Form icon"
					>
						<title>Form icon</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">JSON-Based Form Engine</h1>
				<p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
					A powerful, type-safe form system that generates validation schemas from JSON configuration. Build
					dynamic, responsive forms with conditional logic and automatic validation.
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
							className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium"
						>
							{feature}
						</span>
					))}
				</div>
			</div>
			{/* Core Features */}
			<div className="mb-12">
				<h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Core Features</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature, index) => (
						<Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
							<CardHeader>
								<CardTitle className="flex items-center gap-3">
									<span className="text-2xl">{feature.icon}</span>
									<div>
										{feature.title}
										<Badge variant="secondary" className="ml-2">
											{feature.highlight}
										</Badge>
									</div>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600">{feature.description}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
			{/* Demo Pages */}
			<div className="mb-12">
				<h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Explore the Demos</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{demoPages.map((demo, index) => (
						<Card
							key={index}
							className="cursor-pointer hover:shadow-lg transition-all duration-200 border hover:border-blue-300"
							onClick={() => {
								window.location.href = demo.path;
							}}
						>
							<CardHeader>
								<CardTitle className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<span className="text-2xl">{demo.icon}</span>
										{demo.title}
									</div>
									<Badge
										variant={
											demo.level === 'Beginner'
												? 'default'
												: demo.level === 'Intermediate'
													? 'secondary'
													: 'destructive'
										}
									>
										{demo.level}
									</Badge>
								</CardTitle>
								<CardDescription>{demo.description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</div>
			{/* Quick Start */}
			<Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
				<CardHeader>
					<CardTitle className="text-center">Quick Start Guide</CardTitle>
					<CardDescription className="text-center">
						Get started with the Form Engine in just a few steps
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
						<div>
							<div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
								1
							</div>
							<h3 className="font-semibold mb-2">Define JSON Config</h3>
							<p className="text-sm text-gray-600">Create your form structure in JSON format</p>
						</div>
						<div>
							<div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
								2
							</div>
							<h3 className="font-semibold mb-2">Auto-Generate Schema</h3>
							<p className="text-sm text-gray-600">Validation rules are automatically created</p>
						</div>
						<div>
							<div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
								3
							</div>
							<h3 className="font-semibold mb-2">Render & Validate</h3>
							<p className="text-sm text-gray-600">Display the form with real-time validation</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</FormEngineLayout>
	);
};

FormEngine.config = {
	importMeta: import.meta,
	dependencies: {
		stylesheets: ['./index.css'],
		components: [FormEngineLayout],
	},
};

export default FormEngine;
