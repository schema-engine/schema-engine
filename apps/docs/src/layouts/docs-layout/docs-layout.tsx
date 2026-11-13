import { eco, type LayoutProps } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import {
	RuiSidebar,
	RuiSidebarContent,
	RuiSidebarGroup,
	RuiSidebarGroupHeader,
	RuiSidebarInset,
	RuiSidebarMenu,
	RuiSidebarMenuButton,
	RuiSidebarMenuItem,
	RuiSidebarProvider,
	RuiSidebarSeparator,
	RuiSidebarTrigger,
} from '@ecopages/radiant-ui/sidebar';
import { RuiToc } from '@ecopages/radiant-ui/toc';
import { docsNav } from '@/lib/docs-nav';

import { Logo } from '@/components/logo/logo';
import { GITHUB_MARK_PATH } from '@/components/github-mark';
import { ThemeToggle } from '@/components/theme-toggle/theme-toggle';
import { BaseLayout } from '@/layouts/base-layout';
import { schemaEngineVersion } from '@/lib/schema-engine-version';
import { DocsPagination } from './components/docs-pagination';
import './docs-layout.css';

const ECO_NAVIGATION_EVENTS = 'eco:page-load,eco:after-swap';
const DOCS_SIDEBAR_ID = 'docs-sidebar';

/**
 * Page-section headings for the "On this page" list.
 *
 * @remarks
 * Every engine form root carries `data-se-theme`, so a heading inside a rendered form demo is
 * not a page section. Listing it would also make `RuiToc` give it an `id` at runtime, before
 * React hydrates the island, and the server-rendered heading then mismatches in dev.
 */
const TOC_HEADING_SELECTOR = 'h2:not([data-se-theme] *),h3:not([data-se-theme] *)';

const DocsNavigation = () => (
	<>
		{docsNav.sections.map((section, index) => (
			<>
				{index > 0 ? <RuiSidebarSeparator aria-label="Section divider" /> : null}
				<RuiSidebarGroup aria-label={section.title}>
					<RuiSidebarGroupHeader
						label={
							<>
								<span class="rui-sidebar__group-icon">{section.icon}</span>
								<span>{section.title}</span>
							</>
						}
					/>
					<RuiSidebarMenu aria-label={`${section.title} links`}>
						{section.items.map((item) => (
							<RuiSidebarMenuItem>
								<RuiSidebarMenuButton as="a" href={item.href}>
									{item.title}
								</RuiSidebarMenuButton>
							</RuiSidebarMenuItem>
						))}
					</RuiSidebarMenu>
				</RuiSidebarGroup>
			</>
		))}
	</>
);

const DocsSiteHeader = () => (
	<div class="rui-sidebar-provider__site-header-inner">
		<div class="rui-sidebar-provider__site-header-start">
			<RuiSidebarTrigger
				class="md:hidden"
				placement="header"
				controls={DOCS_SIDEBAR_ID}
				triggerLabel="Close documentation navigation"
			/>
			<RuiSidebarTrigger
				class="md:hidden"
				placement="inset"
				controls={DOCS_SIDEBAR_ID}
				triggerLabel="Open documentation navigation"
			/>
			<Logo href="/" target="_self" title="Schema Engine" />
			<RuiChip variant="default" class="max-md:hidden">
				{schemaEngineVersion}
			</RuiChip>
		</div>
		<nav class="rui-sidebar-provider__site-header-nav" aria-label="Site">
			<RuiButton
				href="https://github.com/andeeplus/schema-engine"
				target="_blank"
				rel="noopener noreferrer"
				variant="ghost"
				size="sm"
				aria-label="GitHub repository"
			>
				<svg viewBox="0 0 98 96" width="20" height="20" fill="currentColor" aria-hidden="true">
					<path d={GITHUB_MARK_PATH} />
				</svg>
			</RuiButton>
			<ThemeToggle id="toggle-dark-mode" label="Theme" data-eco-persist="theme-toggle" />
		</nav>
	</div>
);

export type DocsLayoutProps = LayoutProps<JsxRenderable> & {
	currentHref?: string;
};

export const DocsLayout = eco.layout<JsxRenderable, DocsLayoutProps>({
	dependencies: {
		scripts: [{ src: '../../components/docs-shell/docs-shell.script.ts', ssr: true }],
	},
	render: ({ children, currentHref }) => {
		return (
			<BaseLayout showHeader={false}>
				<RuiSidebarProvider
					layout="docs"
					class="docs-layout"
					siteHeader={<DocsSiteHeader />}
					sidebar={
						<RuiSidebar
							id={DOCS_SIDEBAR_ID}
							data={{ ecoPersist: DOCS_SIDEBAR_ID }}
							collapsible="off"
							defaultWidth={250}
							mobileBreakpoint={768}
							mobileDefaultOpen={false}
							label="Documentation navigation"
							matchActive
							scrollActiveOnMount
							navigationEvents={ECO_NAVIGATION_EVENTS}
						>
							<RuiSidebarContent aria-label="Documentation navigation">
								<DocsNavigation />
							</RuiSidebarContent>
						</RuiSidebar>
					}
				>
					<RuiSidebarInset>
						<div class="docs-layout__content">
							<div class="prose">{children}</div>
							<DocsPagination currentHref={currentHref} />
						</div>
					</RuiSidebarInset>
					<RuiToc
						class="docs-layout__toc"
						target=".docs-layout__content"
						headingSelector={TOC_HEADING_SELECTOR}
						label="On this page"
						scrollOffset={120}
						navigationEvents={ECO_NAVIGATION_EVENTS}
					/>
				</RuiSidebarProvider>
			</BaseLayout>
		);
	},
});

export default DocsLayout;
