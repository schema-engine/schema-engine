import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import { Logo } from '@/components/logo/logo';
import { GITHUB_MARK_PATH } from '@/components/github-mark';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import { schemaEngineVersion } from '@/lib/schema-engine-version';
import './base-layout.css';

export type BaseLayoutProps = {
	children: JsxRenderable;
	class?: string;
	/** When `false`, omit the site header (docs uses `RuiSidebarProvider` site chrome). */
	showHeader?: boolean;
};

export const BaseLayout = eco.component<BaseLayoutProps, JsxRenderable>({
	dependencies: {
		scripts: ['./base-layout.script.ts'],
	},
	render: ({ children, class: className, showHeader = true }) => {
		return (
			<body>
				{showHeader ? (
					<header class="site-header">
						<div class="site-header__inner">
							<div class="site-header__start">
								<Logo href="/" target="_self" title="Schema Engine" />
								<RuiChip variant="default" class="max-md:hidden">
									{schemaEngineVersion}
								</RuiChip>
							</div>
							<nav class="site-header__nav" aria-label="Site">
								<ul>
									<li class="max-md:hidden">
										<RuiButton href="/docs/schema-engine/introduction" variant="ghost" size="sm">
											Docs
										</RuiButton>
									</li>
									<li>
										<RuiButton
											href="https://github.com/andeeplus/schema-engine"
											target="_blank"
											rel="noopener noreferrer"
											variant="ghost"
											size="sm"
											aria-label="GitHub repository"
										>
											<svg
												width="20"
												height="20"
												viewBox="0 0 98 96"
												xmlns="http://www.w3.org/2000/svg"
												fill="currentColor"
												aria-hidden="true"
											>
												<path d={GITHUB_MARK_PATH} />
											</svg>
										</RuiButton>
									</li>
									<li>
										<ThemeToggle id="toggle-dark-mode" label="Theme" />
									</li>
								</ul>
							</nav>
						</div>
					</header>
				) : null}
				{showHeader ? <main class={className}>{children}</main> : children}
				{/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- same markup on every docs site (Ecopages copy contract); not a form result */}
				<div class="code-copy-status" role="status" aria-live="polite" data-code-copy-status></div>
			</body>
		);
	},
});
