'use client';

import { useState, useEffect } from 'react';
import { Github, Sun, Moon, ChevronRight, ChevronDown, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarProvider,
	SidebarInset,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarRail,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { useTheme } from '@/hooks/use-theme';
import type { EcoComponent } from '@ecopages/core';
import type { ReactNode } from 'react';
import pkg from '../../../package.json';
import './docs-layout.css';

export interface DocsSection {
	id: string;
	title: string;
	path: string;
	badge?: string;
	children?: DocsSection[];
}

export interface DocsTocItem {
	id: string;
	title: string;
	level: number;
}

const docsNavigation: DocsSection[] = [
	{
		id: 'getting-started',
		title: 'Getting Started',
		path: '/docs',
		children: [
			{ id: 'introduction', title: 'Introduction', path: '/docs/introduction' },
			{ id: 'installation', title: 'Installation', path: '/docs/installation' },
			{ id: 'quick-start', title: 'Quick Start', path: '/docs/quick-start' },
		],
	},
	{
		id: 'pkg-forms',
		title: '@schema-engine/forms',
		path: '/docs/packages/forms',
		children: [
			{ id: 'forms-overview', title: 'Overview', path: '/docs/packages/forms' },
			{ id: 'forms-getting-started', title: 'Getting Started', path: '/docs/packages/forms/getting-started' },
			{ id: 'forms-core-concepts', title: 'Core Concepts', path: '/docs/packages/forms/core-concepts' },
			{ id: 'forms-validation', title: 'Validation', path: '/docs/packages/forms/validation' },
			{ id: 'forms-actions', title: 'Actions', path: '/docs/packages/forms/actions' },
			{ id: 'forms-api-reference', title: 'API Reference', path: '/docs/packages/forms/api-reference' },
		],
	},
	{
		id: 'pkg-forms-react',
		title: '@schema-engine/forms-react',
		path: '/docs/packages/forms-react',
		children: [
			{ id: 'react-overview', title: 'Overview', path: '/docs/packages/forms-react' },
			{
				id: 'react-getting-started',
				title: 'Getting Started',
				path: '/docs/packages/forms-react/getting-started',
			},
			{ id: 'react-components', title: 'Components', path: '/docs/packages/forms-react/components' },
			{ id: 'react-layouts', title: 'Layouts', path: '/docs/packages/forms-react/layouts' },
			{ id: 'react-steppers', title: 'Steppers', path: '/docs/packages/forms-react/steppers' },
			{ id: 'react-hooks', title: 'Hooks', path: '/docs/packages/forms-react/hooks' },
			{ id: 'react-api-reference', title: 'API Reference', path: '/docs/packages/forms-react/api-reference' },
		],
	},
	{
		id: 'pkg-actions',
		title: '@schema-engine/actions',
		path: '/docs/packages/actions',
		children: [
			{ id: 'actions-overview', title: 'Overview', path: '/docs/packages/actions' },
			{ id: 'actions-getting-started', title: 'Getting Started', path: '/docs/packages/actions/getting-started' },
			{ id: 'actions-core-concepts', title: 'Core Concepts', path: '/docs/packages/actions/core-concepts' },
			{ id: 'actions-advanced', title: 'Advanced Usage', path: '/docs/packages/actions/advanced' },
			{ id: 'actions-api-reference', title: 'API Reference', path: '/docs/packages/actions/api-reference' },
		],
	},
	{
		id: 'pkg-registry',
		title: '@schema-engine/registry',
		path: '/docs/packages/registry',
		children: [
			{ id: 'reg-overview', title: 'Overview', path: '/docs/packages/registry' },
			{ id: 'reg-core-concepts', title: 'Core Concepts', path: '/docs/packages/registry/core-concepts' },
			{ id: 'reg-api-reference', title: 'API Reference', path: '/docs/packages/registry/api-reference' },
			{ id: 'reg-examples', title: 'Examples', path: '/docs/packages/registry/examples' },
		],
	},
	{
		id: 'examples',
		title: 'Examples',
		path: '/docs/examples',
		children: [
			{ id: 'basic-form', title: 'Basic Form', path: '/docs/examples/basic-form' },
			{ id: 'contact-form', title: 'Contact Form', path: '/docs/examples/contact-form' },
			{ id: 'registration-flow', title: 'Registration Flow', path: '/docs/examples/registration-flow' },
			{ id: 'survey-form', title: 'Survey Form', path: '/docs/examples/survey-form' },
			{ id: 'sequential-actions', title: 'Sequential Actions', path: '/docs/examples/sequential-actions' },
		],
	},
];

interface DocsLayoutProps {
	children: ReactNode;
	toc?: DocsTocItem[];
	currentPath?: string;
	className?: string;
}

function DocsSidebar({ currentPath }: { currentPath?: string }) {
	return (
		<Sidebar variant="sidebar">
			<SidebarHeader className="p-4 border-b h-16">
				<div className="space-y-4">
					<a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
						<div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
							<Code2 className="h-4 w-4" />
						</div>
						<div className="flex flex-col gap-0.5 leading-none">
							<span className="font-medium">Schema Engine</span>
							<span className="text-xs text-muted-foreground">v{pkg.version}</span>
						</div>
					</a>
				</div>
			</SidebarHeader>
			<SidebarContent className="gap-0">
				{docsNavigation.map((section) => (
					<Collapsible key={section.id} defaultOpen className="group/collapsible">
						<SidebarGroup>
							<SidebarGroupLabel asChild>
								<CollapsibleTrigger className="[&[data-state=open]>svg]:rotate-90 w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
									<div className="flex items-center gap-2">
										<span>{section.title}</span>
										{section.badge && (
											<Badge variant="secondary" className="text-xs">
												{section.badge}
											</Badge>
										)}
									</div>
									<ChevronRight className="h-4 w-4 transition-transform duration-200" />
								</CollapsibleTrigger>
							</SidebarGroupLabel>
							<CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
								<SidebarGroupContent>
									<SidebarMenu>
										{section.children?.map((item) => (
											<SidebarMenuItem key={item.id}>
												<SidebarMenuButton asChild isActive={currentPath === item.path}>
													<a href={item.path} className="pl-6">
														{item.title}
													</a>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				))}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}

function TableOfContents({ toc }: { toc?: DocsTocItem[] }) {
	const [activeId, setActiveId] = useState<string>('');

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
						break;
					}
				}
			},
			{ rootMargin: '0% 0% -80% 0%' },
		);

		const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
		for (const heading of headings) {
			observer.observe(heading);
		}

		return () => observer.disconnect();
	}, []);

	if (!toc || toc.length === 0) return null;

	return (
		<div className="space-y-2">
			<p className="font-medium">On This Page</p>
			<nav className="text-sm">
				<ul className="space-y-2">
					{toc.map((item) => (
						<li key={item.id}>
							<a
								href={`#${item.id}`}
								className={cn(
									'block py-1 transition-colors hover:text-foreground',
									item.level === 1 && 'pl-0',
									item.level === 2 && 'pl-4',
									item.level === 3 && 'pl-8',
									activeId === item.id ? 'text-foreground font-medium' : 'text-muted-foreground',
								)}
							>
								{item.title}
							</a>
						</li>
					))}
				</ul>
			</nav>
		</div>
	);
}

export const DocsLayout: EcoComponent<DocsLayoutProps, ReactNode> = ({ children, toc, currentPath, className }) => {
	const { toggleTheme } = useTheme();

	return (
		<SidebarProvider defaultOpen>
			<DocsSidebar currentPath={currentPath} />
			<SidebarInset>
				<header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<div className="flex items-center gap-4 ml-2">
							<div className="hidden md:flex items-center">
								<nav className="flex items-center space-x-6 text-sm font-medium">
									<a
										className="transition-colors hover:text-foreground/80 text-foreground/60"
										href="/docs"
									>
										Documentation
									</a>
									<a
										className="transition-colors hover:text-foreground/80 text-foreground/60"
										href="/docs/examples/basic-form"
									>
										Examples
									</a>
								</nav>
							</div>
						</div>
					</div>

					<div className="flex flex-1 items-center justify-end space-x-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="h-8 gap-1">
									v{pkg.version}
									<ChevronDown className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>v{pkg.version}</DropdownMenuItem>
								<DropdownMenuItem disabled>v1.1.0 (coming soon)</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<nav className="flex items-center space-x-1">
							<Button variant="ghost" className="w-9 px-0" onClick={toggleTheme}>
								<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
								<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
								<span className="sr-only">Toggle theme</span>
							</Button>
							<Button variant="ghost" className="w-9 px-0">
								<Github className="h-4 w-4" />
								<span className="sr-only">GitHub</span>
							</Button>
						</nav>
					</div>
				</header>

				<div className="flex-1">
					<div className="w-full px-4 py-4">
						<div className="">
							<div className="space-y-2">
								<Breadcrumb>
									<BreadcrumbList>
										<BreadcrumbItem>
											<BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
										</BreadcrumbItem>
										<BreadcrumbSeparator />
										<BreadcrumbItem>
											<BreadcrumbPage>Current Page</BreadcrumbPage>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>

							<div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-10">
								<div className="min-w-0">
									<div className={cn('prose max-w-none', className)}>{children}</div>
								</div>

								<div className="hidden xl:block">
									<div className="sticky top-6">
										<ScrollArea className="h-[calc(100vh-8rem)]">
											<TableOfContents toc={toc} />
										</ScrollArea>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
};

DocsLayout.config = {
	dependencies: {
		stylesheets: ['./docs-layout.css', '../../styles/tailwind.css'],
	},
};
