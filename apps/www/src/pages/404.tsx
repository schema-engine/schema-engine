import type { EcoComponent, Error404TemplateProps } from '@ecopages/core';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import type { JSX } from 'react';

const Error404: EcoComponent<Error404TemplateProps, JSX.Element> = () => {
	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="border-b border-border bg-background/80 backdrop-blur-md">
				<div className="max-w-7xl mx-auto px-6 py-4">
					<div className="flex items-center justify-between">
						<a href="/" className="flex items-center gap-3 text-foreground">
							<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
								<title>Schema Engine logo</title>
								<rect width="32" height="32" rx="6" fill="currentColor" />
								<rect x="6" y="6" width="20" height="20" rx="2" className="fill-background" />
								<rect x="10" y="12" width="12" height="2" fill="currentColor" />
								<rect x="10" y="16" width="12" height="2" fill="currentColor" />
								<rect x="10" y="20" width="8" height="2" fill="currentColor" />
							</svg>
							<span className="font-semibold text-xl">Schema Engine</span>
						</a>
						<ThemeToggle />
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 flex items-center justify-center px-6">
				<div className="error404-container text-center max-w-lg">
					{/* Large 404 with gradient */}
					<div className="error404-number text-[10rem] md:text-[14rem] font-bold leading-none select-none mb-4">
						404
					</div>

					{/* Message */}
					<h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">Page not found</h1>
					<p className="text-muted-foreground text-lg mb-10 leading-relaxed">
						The page you're looking for doesn't exist or has been moved.
					</p>

					{/* Action buttons */}
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Button asChild size="lg" className="px-8">
							<a href="/" className="no-underline">
								Go Home
							</a>
						</Button>
						<Button asChild variant="outline" size="lg" className="px-8">
							<a href="/docs" className="no-underline">
								View Documentation
							</a>
						</Button>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="border-t border-border py-6 px-6">
				<div className="max-w-7xl mx-auto text-center">
					<p className="text-muted-foreground text-sm">
						Built with React, TypeScript, and Zod. Open source and MIT licensed.
					</p>
				</div>
			</footer>
		</div>
	);
};

Error404.config = {
	dependencies: {
		stylesheets: ['./404.css'],
	},
};

export default Error404;
