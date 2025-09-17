import '@json-form-engine/react/components/form/registry';
import '@json-form-engine/core/actions/debug-registry';
import { Button } from '../components/ui/button';
import { CodePreview } from '../components/code-preview';
import { FormRenderer } from '@json-form-engine/react/components/internals/form-renderer';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import type { FormConfig } from '@json-form-engine/core/schemas';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

const contactFormConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Form',
	mode: 'free',
	steps: [
		{
			id: 'contact-step',
			title: 'Contact Information',
			elements: [
				{
					id: 'email',
					name: 'email',
					componentId: 'input',
					inputType: 'email',
					label: 'Email Address',
					placeholder: 'Enter your email',
					rules: [
						{
							type: 'required',
							message: 'Email is required',
						},
						{
							type: 'email',
							message: 'Please enter a valid email address',
						},
					],
				},
				{
					id: 'message',
					name: 'message',
					componentId: 'textarea',
					label: 'Message',
					placeholder: 'Your message...',
					rules: [
						{
							type: 'minLength',
							value: 10,
							message: 'Message must be at least 10 characters long',
						},
					],
				},
			],
		},
	],
	actions: [
		{
			id: 'contact-submit',
			type: 'submit',
			description: 'Submit contact form',
			successMessage: 'Message sent! Thanks for reaching out.',
			errorMessage: 'Failed to send message. Please try again.',
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST',
		},
	],
};

const features = [
	{
		title: 'JSON Configuration',
		description: 'Define forms entirely in JSON with automatic validation generation',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<title>Document icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
		),
	},
	{
		title: 'Responsive Grids',
		description: 'Advanced layout system with device emulation and breakpoint management',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<title>Grid icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
				/>
			</svg>
		),
	},
	{
		title: 'Conditional Logic',
		description: 'Dynamic field rendering based on real-time form state',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<title>Conditional logic icon</title>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
			</svg>
		),
	},
	{
		title: 'Type Safety',
		description: 'Zod validation schemas created automatically from configuration',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<title>Validation check icon</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		),
	},
];

const demoPages = [
	{
		title: 'Basic Form',
		description: 'Start with JSON-based form validation fundamentals',
		path: '/docs/examples/basic-form',
		level: 'Beginner',
	},
	{
		title: 'Contact Form',
		description: 'Complete contact form with validation',
		path: '/docs/examples/contact-form',
		level: 'Intermediate',
	},
	{
		title: 'Registration Flow',
		description: 'Multi-step registration with complex validation',
		path: '/docs/examples/registration-flow',
		level: 'Advanced',
	},
	{
		title: 'Survey Form',
		description: 'Dynamic survey with conditional fields',
		path: '/docs/examples/survey-form',
		level: 'Advanced',
	},
	{
		title: 'Sequential Actions',
		description: 'Complex workflows with chained actions',
		path: '/docs/examples/sequential-actions',
		level: 'Advanced',
	},
];

const FormEngine: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border">
				<div className="max-w-7xl mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-8">
							<div className="flex items-center space-x-3">
								<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
									<title>Form Engine logo</title>
									<rect width="32" height="32" rx="6" fill="hsl(var(--foreground))" />
									<rect x="6" y="6" width="20" height="20" rx="2" fill="hsl(var(--background))" />
									<rect x="10" y="12" width="12" height="2" fill="hsl(var(--foreground))" />
									<rect x="10" y="16" width="12" height="2" fill="hsl(var(--foreground))" />
									<rect x="10" y="20" width="8" height="2" fill="hsl(var(--foreground))" />
								</svg>
								<span className="font-semibold text-xl text-foreground">Form Engine</span>
							</div>
							<nav className="hidden md:flex items-center space-x-6">
								<a
									href="/docs"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Docs
								</a>
							</nav>
						</div>
						<div className="flex items-center space-x-4">
							<ThemeToggle />
							<a
								href="https://github.com/andeeplus"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<title>GitHub logo</title>
									<path
										fillRule="evenodd"
										d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
										clipRule="evenodd"
									/>
								</svg>
							</a>
						</div>
					</div>
				</div>
			</header>

			<section className="py-24 px-6 prose">
				<div className="max-w-4xl mx-auto text-center">
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6">
						JSON-Based
						<br />
						<span className="text-muted-foreground">Form Engine</span>
					</h1>
					<p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
						Build dynamic, type-safe forms with automatic validation. Configure everything in JSON, get Zod
						schemas for free.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
						<Button
							asChild
							size="lg"
							className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
						>
							<a href="/docs/examples/basic-form" className="no-underline">
								View Examples
							</a>
						</Button>
						<Button asChild variant="outline" size="lg" className="px-8">
							<a href="/docs" className="no-underline">
								Read Docs
							</a>
						</Button>
					</div>

					<div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-16">
						<span className="flex items-center gap-2">
							<div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
							100% Serializable
						</span>
						<span className="flex items-center gap-2">
							<div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
							Auto-Generated Schemas
						</span>
						<span className="flex items-center gap-2">
							<div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
							Real-time Validation
						</span>
						<span className="flex items-center gap-2">
							<div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
							Tree-Shakable
						</span>
					</div>
				</div>
				<CodePreview
					className="unprose"
					code={JSON.stringify(contactFormConfig, null, 2)}
					example={<FormRenderer config={contactFormConfig} />}
					fileName="contact-form.json"
					maxHeight="400px"
				/>
			</section>

			<Separator className="max-w-6xl mx-auto" />

			<section className="py-24 px-6">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Core Features</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Everything you need to build powerful, maintainable forms with minimal code.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{features.map((feature, index) => (
							<div key={index} className="group">
								<div className="flex items-start space-x-4 p-6 rounded-lg border border-border hover:border-accent transition-colors bg-card">
									<div className="flex-shrink-0 text-muted-foreground group-hover:text-accent transition-colors">
										{feature.icon}
									</div>
									<div>
										<h3 className="font-semibold text-lg text-card-foreground mb-2">
											{feature.title}
										</h3>
										<p className="text-muted-foreground">{feature.description}</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<Separator className="max-w-6xl mx-auto" />

			<section className="py-24 px-6">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Explore the Examples</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Real-world examples showcasing different form patterns and use cases.
						</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{demoPages.map((demo, index) => (
							<Card
								key={index}
								className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-border hover:border-accent bg-card"
								onClick={() => {
									window.location.href = demo.path;
								}}
							>
								<CardHeader>
									<div className="flex items-center justify-between mb-2">
										<Badge
											variant={
												demo.level === 'Beginner'
													? 'secondary'
													: demo.level === 'Intermediate'
														? 'outline'
														: 'default'
											}
											className="text-xs"
										>
											{demo.level}
										</Badge>
									</div>
									<CardTitle className="text-lg group-hover:text-accent transition-colors text-card-foreground">
										{demo.title}
									</CardTitle>
									<CardDescription className="text-muted-foreground">
										{demo.description}
									</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</div>
			</section>

			<Separator className="max-w-6xl mx-auto" />

			<section className="py-24 px-6">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-3xl font-bold text-foreground mb-4">Quick Start</h2>
						<p className="text-muted-foreground">Get up and running in three simple steps</p>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="text-center">
							<div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
								1
							</div>
							<h3 className="font-semibold text-lg mb-2 text-foreground">Define Structure</h3>
							<p className="text-muted-foreground text-sm">
								Create your form configuration in JSON format with field definitions
							</p>
						</div>
						<div className="text-center">
							<div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
								2
							</div>
							<h3 className="font-semibold text-lg mb-2 text-foreground">Auto-Generate</h3>
							<p className="text-muted-foreground text-sm">
								Validation schemas and types are automatically created from your config
							</p>
						</div>
						<div className="text-center">
							<div className="w-12 h-12 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
								3
							</div>
							<h3 className="font-semibold text-lg mb-2 text-foreground">Render & Validate</h3>
							<p className="text-muted-foreground text-sm">
								Display your form with real-time validation and error handling
							</p>
						</div>
					</div>
				</div>
			</section>

			<footer className="border-t border-border py-12 px-6">
				<div className="max-w-6xl mx-auto text-center">
					<p className="text-muted-foreground text-sm">
						Built with React, TypeScript, and Zod. Open source and MIT licensed.
					</p>
				</div>
			</footer>
		</div>
	);
};

FormEngine.config = {
	importMeta: import.meta,
	dependencies: {
		stylesheets: ['./index.css'],
	},
};

export default FormEngine;
