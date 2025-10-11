import { useEffect, useState, type ReactNode } from 'react';
import type { EcoComponent } from '@ecopages/core';
import { Badge } from '@/components/ui/badge';
import { FormEngineProvider } from '@json-form-engine/react/components/adapter-provider';
import { rhfAdapter } from '@json-form-engine/react/adapters/rhf';
import { formEngine } from '@/lib/form-engine-setup';

export type FormEngineLayoutProps = {
	children: ReactNode;
	className?: string;
	id?: string;
};

export interface NavigationItem {
	id: string;
	title: string;
	description: string;
	badge?: string;
	path: string;
}

export const navigationItems: NavigationItem[] = [
	{
		id: 'overview',
		title: 'Overview',
		description: 'Form Engine introduction and features',
		path: '/',
	},
	{
		id: 'basic-demo',
		title: 'Basic Demo',
		description: 'JSON-based form validation fundamentals',
		badge: 'Core',
		path: '/demo/basic',
	},
	{
		id: 'responsive-grid',
		title: 'Responsive Grid',
		description: 'Adaptive layouts across devices',
		badge: 'Layout',
		path: '/demo/responsive-grid',
	},
	{
		id: 'showcase',
		title: 'Complete Showcase',
		description: 'All features in tabbed interface',
		badge: 'Advanced',
		path: '/demo/showcase',
	},
	{
		id: 'conditional-forms',
		title: 'Conditional Forms',
		description: 'Dynamic field rendering and logic',
		badge: 'Logic',
		path: '/demo/conditional-forms',
	},
	{
		id: 'actions',
		title: 'Actions System',
		description: 'Serializable actions and handlers',
		badge: 'Actions',
		path: '/demo/actions',
	},
	{
		id: 'multi-step-forms',
		title: 'Multi-Step Forms',
		description: 'Complex forms with multiple steps',
		badge: 'Advanced',
		path: '/demo/multi-step-forms',
	},
	{
		id: 'sequential-actions',
		title: 'Sequential Actions',
		description: 'Chained actions and workflows',
		badge: 'Advanced',
		path: '/demo/sequential-actions',
	},
];

/**
 * Navigation component for Form Engine demos
 */
function Navigation({ currentPath }: { currentPath: string }) {
	return (
		<nav className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-6 py-4">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Form Engine Demos
						</h1>
						<p className="text-gray-600 mt-1">Explore the power of JSON-driven form validation</p>
					</div>
					<a href="/" className="text-sm">
						← Back to Home
					</a>
				</div>

				<div className="flex flex-wrap gap-3">
					{navigationItems.map((item) => (
						<a
							key={item.id}
							// variant={currentPath === item.path ? 'default' : 'outline'}
							href={item.path}
							className="flex items-center gap-2 h-auto flex-col sm:flex-row p-3 min-h-[4rem] sm:min-h-[3rem]"
						>
							<div className="flex items-center gap-2">
								<span className="font-medium">{item.title}</span>
								{item.badge && (
									<Badge variant="secondary" className="text-xs">
										{item.badge}
									</Badge>
								)}
							</div>
							<span className="text-xs text-muted-foreground hidden sm:block">{item.description}</span>
						</a>
					))}
				</div>

				<div className="sm:hidden mt-3">
					{navigationItems.map((item) => {
						if (currentPath === item.path) {
							return (
								<p key={item.id} className="text-sm text-gray-600">
									{item.description}
								</p>
							);
						}
						return null;
					})}
				</div>
			</div>
		</nav>
	);
}

export const FormEngineLayout: EcoComponent<FormEngineLayoutProps, ReactNode> = ({ children, className }) => {
	const [currentPath, setCurrentPath] = useState('');

	useEffect(() => {
		setCurrentPath(window.location.pathname);
	}, []);

	return (
		<body>
			<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
				<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
					<Navigation currentPath={currentPath} />
					<main className={className}>{children}</main>
				</div>
			</FormEngineProvider>
		</body>
	);
};

FormEngineLayout.config = {
	importMeta: import.meta,
	dependencies: {
		stylesheets: ['./form-engine-layout.css', '../../styles/tailwind.css'],
	},
};
