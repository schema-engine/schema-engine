import { Button } from '../components/ui/button';
import { CodePreview } from '../components/code-preview';
import { FormRenderer } from '@schema-engine/forms-react/components/internals/form-renderer';

import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { FormEngineProvider } from '@schema-engine/forms-react/components/adapter-provider';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';
import { formEngine } from '@/lib/form-engine-setup';
import '@schema-engine/forms/schemas/validation/validation-registry';
import type { FormConfig } from '@schema-engine/forms/schemas';
import type { EcoComponent } from '@ecopages/core';
import type { JSX, ReactNode } from 'react';

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
					$type: 'input',
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
					$type: 'textarea',
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
				{
					$type: 'submit',
					label: 'Submit Form',
					name: 'submit',
				},
			],
		},
	],
	actions: [
		{
			id: 'contact-submit',
			$type: 'submit',
			description: 'Submit contact form',
			successMessage: 'Message sent! Thanks for reaching out.',
			errorMessage: 'Failed to send message. Please try again.',
			enabled: true,
			endpoint: '/api/submit-demo',
			method: 'POST',
		},
	],
};

// Feature icons as reusable components
const icons = {
	json: (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<title>JSON Configuration</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
			/>
		</svg>
	),
	validation: (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<title>Type Safety</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	),
	grid: (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<title>Responsive Grids</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
			/>
		</svg>
	),
	conditional: (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<title>Conditional Logic</title>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
		</svg>
	),
	actions: (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<title>Action System</title>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
		</svg>
	),
	steps: (
		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<title>Multi-step Forms</title>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={1.5}
				d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
			/>
		</svg>
	),
};

// Product feature data
const productFeatures = [
	{
		title: 'JSON Configuration',
		description: 'Define forms entirely in JSON. No component boilerplate, just data.',
		icon: icons.json,
		href: '/docs/packages/forms',
	},
	{
		title: 'Auto Validation',
		description: 'Zod schemas generated automatically from your form rules.',
		icon: icons.validation,
		href: '/docs/packages/forms/validation',
	},
	{
		title: 'Responsive Grids',
		description: 'Built-in grid system with breakpoint-aware layouts.',
		icon: icons.grid,
		href: '/docs/packages/forms-react',
	},
	{
		title: 'Conditional Logic',
		description: 'Show, hide, and transform fields based on form state.',
		icon: icons.conditional,
		href: '/docs/packages/forms/conditional-logic',
	},
	{
		title: 'Action System',
		description: 'Sequential action execution for complex form workflows.',
		icon: icons.actions,
		href: '/docs/packages/actions',
	},
	{
		title: 'Multi-step Forms',
		description: 'Wizard-style forms with progress tracking and validation per step.',
		icon: icons.steps,
		href: '/docs/packages/forms/multi-step',
	},
];

// Packages data
const packages = [
	{
		title: '@schema-engine/forms',
		description: 'Core engine for building type-safe, JSON-configured forms.',
		href: '/docs/packages/forms',
	},
	{
		title: '@schema-engine/forms-react',
		description: 'React adapter with production-ready components and hooks.',
		href: '/docs/packages/forms-react',
	},
	{
		title: '@schema-engine/actions',
		description: 'Domain-agnostic sequential action execution system.',
		href: '/docs/packages/actions',
	},
	{
		title: '@schema-engine/registry',
		description: 'Base registry system for building extensible architectures.',
		href: '/docs/packages/registry',
	},
];

// Quick start steps
const quickStartSteps = [
	{
		step: 1,
		title: 'Define Your Schema',
		description: 'Create your form configuration in JSON format with field definitions and validation rules.',
		variant: 'primary' as const,
	},
	{
		step: 2,
		title: 'Get Type Safety',
		description: 'Zod validation schemas and TypeScript types are automatically generated from your config.',
		variant: 'secondary' as const,
	},
	{
		step: 3,
		title: 'Render & Submit',
		description: 'Use the React adapter to render your form with real-time validation and action handling.',
		variant: 'accent' as const,
	},
];

// Reusable components
function FeatureCard({
	title,
	description,
	icon,
	href,
}: {
	title: string;
	description: string;
	icon: ReactNode;
	href: string;
}) {
	return (
		<a
			href={href}
			className="group block p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
		>
			<div className="flex items-start gap-4">
				<div className="shrink-0 p-2 bg-muted rounded-lg text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
					{icon}
				</div>
				<div>
					<h3 className="font-semibold text-lg mb-1 text-card-foreground group-hover:text-primary transition-colors">
						{title}
					</h3>
					<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
				</div>
			</div>
		</a>
	);
}

function PackageCard({ title, description, href }: { title: string; description: string; href: string }) {
	return (
		<a
			href={href}
			className="group block p-6 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-300"
		>
			<h3 className="font-mono font-semibold text-base mb-2 text-card-foreground group-hover:text-primary transition-colors">
				{title}
			</h3>
			<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
			<div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
				<span>View docs</span>
				<svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<title>Arrow right</title>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
				</svg>
			</div>
		</a>
	);
}

function StepCard({
	step,
	title,
	description,
	variant,
}: {
	step: number;
	title: string;
	description: string;
	variant: 'primary' | 'secondary' | 'accent';
}) {
	const bgColors = {
		primary: 'bg-primary text-primary-foreground',
		secondary: 'bg-secondary text-secondary-foreground',
		accent: 'bg-accent text-accent-foreground',
	};

	return (
		<div className="text-center group">
			<div
				className={`w-14 h-14 ${bgColors[variant]} rounded-2xl flex items-center justify-center mx-auto mb-5 font-bold text-xl shadow-lg group-hover:scale-110 transition-transform`}
			>
				{step}
			</div>
			<h3 className="font-semibold text-lg mb-2 text-foreground">{title}</h3>
			<p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
		</div>
	);
}

// Page sections
function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
			<div className="max-w-7xl mx-auto px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-8">
						<a href="/" className="flex items-center gap-3 text-foreground">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								viewBox="0 0 32 32"
								className="text-foreground"
							>
								<title>Schema Engine logo</title>
								<rect width="32" height="32" rx="6" fill="currentColor" />
								<rect x="6" y="6" width="20" height="20" rx="2" className="fill-background" />
								<rect x="10" y="12" width="12" height="2" fill="currentColor" />
								<rect x="10" y="16" width="12" height="2" fill="currentColor" />
								<rect x="10" y="20" width="8" height="2" fill="currentColor" />
							</svg>
							<span className="font-semibold text-xl">Schema Engine</span>
						</a>
						<nav className="hidden md:flex items-center gap-6">
							<a href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
								Documentation
							</a>
							<a
								href="/docs/packages/forms"
								className="text-muted-foreground hover:text-foreground transition-colors"
							>
								Packages
							</a>
						</nav>
					</div>
					<div className="flex items-center gap-4">
						<ThemeToggle />
						<a
							href="https://github.com/andeeplus"
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<title>GitHub</title>
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
	);
}

function HeroSection() {
	return (
		<section className="relative py-24 lg:py-32 px-6 overflow-hidden">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-linear-to-b from-muted/30 to-transparent pointer-events-none" />

			<div className="relative max-w-4xl mx-auto text-center">
				<h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6">
					Schema-Driven
					<br />
					<span className="text-muted-foreground">Developer Toolkit</span>
				</h1>

				<p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
					A framework-agnostic toolkit for building schema-driven interfaces. Define your UI in JSON, get
					automatic Zod validation and type safety. Use with React today, more adapters coming soon.
				</p>

				<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
					<Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20">
						<a href="/docs/packages/forms" className="no-underline">
							Get Started
						</a>
					</Button>
					<Button asChild variant="outline" size="lg" className="px-8">
						<a href="/docs" className="no-underline">
							View Documentation
						</a>
					</Button>
				</div>

				<div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
					<span className="flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						Framework Agnostic
					</span>
					<span className="flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						Type Safe
					</span>
					<span className="flex items-center gap-2">
						<span className="w-2 h-2 bg-primary rounded-full" />
						Zero Boilerplate
					</span>
				</div>
			</div>
		</section>
	);
}

function DemoSection() {
	return (
		<section className="py-16 px-6">
			<div className="max-w-5xl mx-auto">
				<CodePreview
					className="shadow-2xl shadow-black/10 dark:shadow-black/30 rounded-xl overflow-hidden"
					code={JSON.stringify(contactFormConfig, null, 2)}
					example={<FormRenderer config={contactFormConfig} />}
					fileName="contact-form.json"
					maxHeight="500px"
				/>
			</div>
		</section>
	);
}

function FeaturesSection() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What's in Schema Engine?</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto text-lg">
						Everything you need to build powerful, maintainable forms with minimal code.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
					{productFeatures.map((feature) => (
						<FeatureCard key={feature.title} {...feature} />
					))}
				</div>
			</div>
		</section>
	);
}

function QuickStartSection() {
	return (
		<section className="py-24 px-6 bg-muted/30">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Get Started in Seconds</h2>
					<p className="text-muted-foreground text-lg">Three steps to your first schema-driven form</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
					{quickStartSteps.map((item) => (
						<StepCard key={item.step} {...item} />
					))}
				</div>
			</div>
		</section>
	);
}

function PackagesSection() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Modular Packages</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto text-lg">
						Use exactly what you need. Each package is designed to work independently or together.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					{packages.map((pkg) => (
						<PackageCard key={pkg.title} {...pkg} />
					))}
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="border-t border-border py-16 px-6">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
					{/* Brand */}
					<div className="md:col-span-2">
						<div className="flex items-center gap-3 mb-4 text-foreground">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
								<title>Schema Engine logo</title>
								<rect width="32" height="32" rx="6" fill="currentColor" />
								<rect x="6" y="6" width="20" height="20" rx="2" className="fill-background" />
								<rect x="10" y="12" width="12" height="2" fill="currentColor" />
								<rect x="10" y="16" width="12" height="2" fill="currentColor" />
								<rect x="10" y="20" width="8" height="2" fill="currentColor" />
							</svg>
							<span className="font-semibold">Schema Engine</span>
						</div>
						<p className="text-muted-foreground text-sm max-w-md leading-relaxed">
							Build dynamic, type-safe forms with automatic validation. Open source and MIT licensed.
						</p>
					</div>

					{/* Documentation */}
					<div>
						<h4 className="font-semibold text-foreground mb-4">Documentation</h4>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="/docs"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Introduction
								</a>
							</li>
							<li>
								<a
									href="/docs/installation"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Installation
								</a>
							</li>
							<li>
								<a
									href="/docs/quick-start"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									Quick Start
								</a>
							</li>
						</ul>
					</div>

					{/* Packages */}
					<div>
						<h4 className="font-semibold text-foreground mb-4">Packages</h4>
						<ul className="space-y-3 text-sm">
							<li>
								<a
									href="/docs/packages/forms"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									@schema-engine/forms
								</a>
							</li>
							<li>
								<a
									href="/docs/packages/forms-react"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									@schema-engine/forms-react
								</a>
							</li>
							<li>
								<a
									href="/docs/packages/actions"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									@schema-engine/actions
								</a>
							</li>
							<li>
								<a
									href="/docs/packages/registry"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									@schema-engine/registry
								</a>
							</li>
						</ul>
					</div>
				</div>

				<Separator className="my-10" />

				<div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
					<p>Built with React, TypeScript, and Zod.</p>
					<div className="flex items-center gap-6">
						<a
							href="https://github.com/andeeplus"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground transition-colors"
						>
							GitHub
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

const SchemaEngine: EcoComponent<unknown, JSX.Element> = () => {
	return (
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<div className="min-h-screen bg-background">
				<Header />
				<main>
					<HeroSection />
					<DemoSection />
					<Separator className="max-w-6xl mx-auto" />
					<FeaturesSection />
					<QuickStartSection />
					<Separator className="max-w-6xl mx-auto" />
					<PackagesSection />
				</main>
				<Footer />
			</div>
		</FormEngineProvider>
	);
};

SchemaEngine.config = {
	dependencies: {
		stylesheets: ['./index.css'],
	},
};

export default SchemaEngine;
