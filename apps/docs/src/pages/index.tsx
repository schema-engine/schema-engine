import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import { RuiCycleToggle, RuiCycleToggleItem } from '@ecopages/radiant-ui/cycle-toggle';
import {
	RuiFeed,
	RuiFeedArticle,
	RuiFeedArticleActions,
	RuiFeedArticleContent,
	RuiFeedArticleHeader,
} from '@ecopages/radiant-ui/feed';
import { RuiHeading, RuiHeadingEyebrow, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { BaseLayout } from '@/layouts/base-layout';
import { FormRendererPreview } from '@/components/form-renderer';
import { contactFormConfig, contactFormConfigExample, contactFormYamlExample } from '@/homepage/examples';
import './index.css';

type HomeFeedArticleData = {
	href: string;
	label: string;
	title: string;
	description: string;
};

const EXPLORE_ARTICLES: HomeFeedArticleData[] = [
	{
		href: '/docs/registry/overview',
		label: 'Registry',
		title: 'Register your own pieces',
		description:
			'A component, an action or a rule is a registration: a $type, a schema for its configuration and metadata. A document names registrations by $type, and a registry resolves them.',
	},
	{
		href: '/docs/actions/overview',
		label: 'Actions',
		title: 'Workflows as data',
		description:
			'Actions run in sequence, a nested list runs in parallel and a failure can cancel the rest. The entries are JSON, so a server can send a workflow and parseActions checks it before anything runs.',
	},
	{
		href: '/docs/forms/overview',
		label: 'Forms',
		title: 'The first domain',
		description:
			'Fields, rules, constraints, steps and the submit lifecycle. The engine owns the form state, so there is no form library to adapt.',
	},
	{
		href: '/docs/schema-engine/packages',
		label: 'Renderers',
		title: 'React and Radiant',
		description:
			'One form config renders with Forms React, with widgets you write or copy, and with Forms Radiant, whose elements ship in the package.',
	},
];

const PATH_STEPS = [
	'Read the introduction: the common language, and why it exists.',
	'Run the quick start: a registry and a JSON workflow, with no UI.',
	'Learn the registry and the actions.',
	'Add Forms, then Forms React or Forms Radiant.',
	'Copy a recipe from the examples and make it yours.',
];

type HomePathCardData = {
	href: string;
	title: string;
	description: string;
};

const PATH_CARDS: HomePathCardData[] = [
	{
		href: '/docs/schema-engine/packages',
		title: 'Install what you need',
		description: 'Pick the packages for a registry, actions, a form or a layout, and see what each one needs.',
	},
	{
		href: '/docs/schema-engine/core-concepts',
		title: 'Learn the vocabulary',
		description: 'Document, $type, registration, registry, action, trigger and renderer, defined once.',
	},
	{
		href: '/docs/examples/overview',
		title: 'Explore the examples',
		description:
			'Tested recipes for a registry, a workflow and forms in React and Radiant, with the files to copy.',
	},
];

const HERO_PILLS = ['Registry', 'Serializable actions', 'React and Radiant', 'Type safe'];

const PreviewChrome = ({
	label,
	traffic,
	children,
}: {
	label: string;
	traffic?: 'code' | 'preview';
	children: JsxRenderable;
}) => (
	<div class="home-preview">
		<div class="home-preview__bar">
			<span class="home-preview__dots" aria-hidden="true">
				<span class={`home-preview__dot ${traffic === 'preview' ? '' : 'home-preview__dot--red'}`} />
				<span class={`home-preview__dot ${traffic === 'preview' ? '' : 'home-preview__dot--yellow'}`} />
				<span class={`home-preview__dot ${traffic === 'preview' ? '' : 'home-preview__dot--green'}`} />
			</span>
			<span class="home-preview__label">{label}</span>
		</div>
		<div class="home-preview__body">{children}</div>
	</div>
);

const AGENT_LINKS = [
	{ href: '/skill.txt', label: 'skill.txt' },
	{ href: '/skill/SKILL.md', label: 'SKILL.md' },
	{ href: '/llms.txt', label: 'llms.txt' },
];

const ECOSYSTEM_PACKAGES = [
	'@schema-engine/registry',
	'@schema-engine/actions',
	'@schema-engine/forms',
	'@schema-engine/forms-react',
	'@schema-engine/forms-radiant',
	'@schema-engine/layout',
];

type HomeFooterLink = {
	label: string;
	href?: string;
	external?: boolean;
};

type HomeFooterColumnData = {
	title: string;
	links: HomeFooterLink[];
};

const HOME_FOOTER_COLUMNS: HomeFooterColumnData[] = [
	{
		title: 'Ecosystem',
		links: [
			{ label: 'Ecopages', href: 'https://ecopages.app', external: true },
			{ label: 'Radiant', href: 'https://radiant.ecopages.app', external: true },
			{ label: 'Radiant UI', href: 'https://radiant-ui.ecopages.app', external: true },
			{ label: 'Schema Engine' },
		],
	},
	{
		title: 'Guides',
		links: [
			{ label: 'Introduction', href: '/docs/schema-engine/introduction' },
			{ label: 'Quick start', href: '/docs/schema-engine/quick-start' },
			{ label: 'Core concepts', href: '/docs/schema-engine/core-concepts' },
			{ label: 'Packages', href: '/docs/schema-engine/packages' },
		],
	},
	{
		title: 'Packages',
		links: [
			{ label: 'Registry', href: '/docs/registry/overview' },
			{ label: 'Actions', href: '/docs/actions/overview' },
			{ label: 'Forms', href: '/docs/forms/overview' },
			{ label: 'Forms React', href: '/docs/forms-react/overview' },
			{ label: 'Forms Radiant', href: '/docs/forms-radiant/overview' },
			{ label: 'Layout', href: '/docs/layout/overview' },
			{ label: 'Examples', href: '/docs/examples/overview' },
		],
	},
	{
		title: 'npm',
		links: [
			{
				label: '@schema-engine/registry',
				href: 'https://www.npmjs.com/package/@schema-engine/registry',
				external: true,
			},
			{
				label: '@schema-engine/actions',
				href: 'https://www.npmjs.com/package/@schema-engine/actions',
				external: true,
			},
			{
				label: '@schema-engine/forms',
				href: 'https://www.npmjs.com/package/@schema-engine/forms',
				external: true,
			},
			{
				label: '@schema-engine/forms-react',
				href: 'https://www.npmjs.com/package/@schema-engine/forms-react',
				external: true,
			},
			{
				label: '@schema-engine/forms-radiant',
				href: 'https://www.npmjs.com/package/@schema-engine/forms-radiant',
				external: true,
			},
			{
				label: '@schema-engine/layout',
				href: 'https://www.npmjs.com/package/@schema-engine/layout',
				external: true,
			},
		],
	},
];

const HomeIcon = ({ children }: { children: JsxRenderable }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{children}
	</svg>
);

const HomeGitHubIcon = () => (
	<HomeIcon>
		<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
	</HomeIcon>
);

const LockIcon = () => (
	<HomeIcon>
		<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
		<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
	</HomeIcon>
);

const HomeFeedArticle = ({
	href,
	label,
	title,
	description,
	position,
	setsize,
}: HomeFeedArticleData & { position: number; setsize: number }) => (
	<RuiFeedArticle posinset={position} setsize={setsize} tabindex={-1}>
		<RuiFeedArticleHeader>
			<RuiHeading size="sm">
				<RuiHeadingEyebrow>{label}</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h2">{title}</RuiHeadingTitle>
			</RuiHeading>
		</RuiFeedArticleHeader>
		<RuiFeedArticleContent>
			<p>{description}</p>
		</RuiFeedArticleContent>
		<RuiFeedArticleActions class="mt-auto">
			<RuiButton href={href} variant="link" size="none">
				Explore {label}
			</RuiButton>
		</RuiFeedArticleActions>
	</RuiFeedArticle>
);

const HomePathCard = ({ href, title, description }: HomePathCardData) => (
	<a
		href={href}
		class="flex flex-col gap-1 rounded-sm border border-border bg-background p-4 text-on-background no-underline transition-colors hover:bg-secondary-container/30"
	>
		<p class="text-sm font-semibold">{title}</p>
		<p class="text-sm text-on-background/70">{description}</p>
	</a>
);

const HomeFooterNavItem = ({ link }: { link: HomeFooterLink }) => (
	<li>
		{link.href ? (
			<a href={link.href} {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
				{link.label}
			</a>
		) : (
			<span aria-current="page">{link.label}</span>
		)}
	</li>
);

const HomeFooterColumn = ({ title, links }: HomeFooterColumnData) => (
	<div class="home-footer__col">
		<p class="home-footer__label">{title}</p>
		<ul class="home-footer__list">
			{links.map((link) => (
				<HomeFooterNavItem link={link} />
			))}
		</ul>
	</div>
);

const copyrightYear = new Date().getFullYear();

const HomeFooterBar = () => (
	<div class="home-footer__bar">
		<p>
			Created by{' '}
			<a href="https://github.com/andeeplus" target="_blank" rel="noopener noreferrer">
				andeeplus
			</a>
		</p>
		<p>
			Built with{' '}
			<a href="https://github.com/ecopages/ecopages" target="_blank" rel="noopener noreferrer">
				Ecopages
			</a>
			© {copyrightYear}
		</p>
	</div>
);

const HomeFooter = () => (
	<footer class="home-footer">
		<nav class="home-footer__nav" aria-label="Ecopages ecosystem">
			{HOME_FOOTER_COLUMNS.map((column) => (
				<HomeFooterColumn title={column.title} links={column.links} />
			))}
		</nav>
		<HomeFooterBar />
	</footer>
);

const HomeSidebarSection = ({ label, children }: { label: string; children: JsxRenderable }) => (
	<div class="home-sidebar__section">
		<p class="home-sidebar__label">{label}</p>
		{children}
	</div>
);

const HomeSidebar = () => (
	<aside class="home-sidebar">
		<HomeSidebarSection label="Repository">
			<a href="https://github.com/andeeplus/schema-engine" class="home-sidebar__value home-sidebar__link">
				<HomeGitHubIcon />
				andeeplus/schema-engine
			</a>
		</HomeSidebarSection>
		<HomeSidebarSection label="License">
			<p class="home-sidebar__value">
				<LockIcon />
				MIT
			</p>
		</HomeSidebarSection>
		<HomeSidebarSection label="For agents">
			<div class="home-sidebar__tags">
				{AGENT_LINKS.map((link) => (
					<RuiButton href={link.href} variant="outline" size="sm" class="font-mono">
						{link.label}
					</RuiButton>
				))}
			</div>
		</HomeSidebarSection>
		<HomeSidebarSection label="Packages">
			<div class="home-sidebar__tags">
				{ECOSYSTEM_PACKAGES.map((name) => (
					<RuiChip class="font-mono">{name}</RuiChip>
				))}
			</div>
		</HomeSidebarSection>
	</aside>
);

const HomeHero = () => (
	<header class="home-header">
		<div class="home-hero">
			<h1 class="home-hero__title">
				Declarative interfaces
				<br />
				<span>with your own components and actions</span>
			</h1>
			<p class="home-hero__lede">
				A common language for describing an interface or a process as JSON. Register your own components and
				actions, send the document from a server to a client, and render it with React or Radiant. Any Standard
				Schema library validates it.
			</p>
			<div class="home-hero__actions">
				<RuiButton href="/docs/schema-engine/quick-start" size="lg">
					Get started
				</RuiButton>
				<RuiButton href="/docs/schema-engine/introduction" variant="outline" size="lg">
					Read the introduction
				</RuiButton>
			</div>
			<ul class="home-hero__pills">
				{HERO_PILLS.map((label) => (
					<li>
						<RuiChip>{label}</RuiChip>
					</li>
				))}
			</ul>
		</div>
	</header>
);

const HomeDemo = () => (
	<section class="home-demo" aria-label="Contact form from JSON">
		<div class="home-demo__grid">
			<div class="home-preview home-source">
				<div class="home-preview__bar">
					<span class="home-preview__dots" aria-hidden="true">
						<span class="home-preview__dot home-preview__dot--red" />
						<span class="home-preview__dot home-preview__dot--yellow" />
						<span class="home-preview__dot home-preview__dot--green" />
					</span>
					<div class="home-source__switch">
						<span>contact-form.</span>
						<RuiCycleToggle value="json" label="Source format" variant="outline" size="sm">
							<RuiCycleToggleItem id="json" selected>
								json
							</RuiCycleToggleItem>
							<RuiCycleToggleItem id="yaml" selected={false}>
								yaml
							</RuiCycleToggleItem>
						</RuiCycleToggle>
					</div>
				</div>
				<div class="home-preview__body">
					<figure data-rehype-pretty-code-figure class="home-code-block home-source__json">
						{unsafeHtml(contactFormConfigExample)}
					</figure>
					<figure data-rehype-pretty-code-figure class="home-code-block home-source__yaml">
						{unsafeHtml(contactFormYamlExample)}
					</figure>
				</div>
			</div>
			<PreviewChrome label="Live Preview" traffic="preview">
				<FormRendererPreview config={contactFormConfig} />
			</PreviewChrome>
		</div>
	</section>
);

const HomeExplore = () => (
	<section>
		<RuiFeed label="Explore Schema Engine" class="home-cards">
			{EXPLORE_ARTICLES.map((article, index) => (
				<HomeFeedArticle
					href={article.href}
					label={article.label}
					title={article.title}
					description={article.description}
					position={index + 1}
					setsize={EXPLORE_ARTICLES.length}
				/>
			))}
		</RuiFeed>
	</section>
);

const HomePath = () => (
	<section class="home-path">
		<RuiHeading as="header" size="sm">
			<RuiHeadingEyebrow>Suggested path</RuiHeadingEyebrow>
			<RuiHeadingTitle as="h2">Build confidence step by step</RuiHeadingTitle>
		</RuiHeading>
		<ol class="home-path__list">
			{PATH_STEPS.map((step) => (
				<li>{step}</li>
			))}
		</ol>
		<div class="mt-8 grid gap-3">
			{PATH_CARDS.map((card) => (
				<HomePathCard href={card.href} title={card.title} description={card.description} />
			))}
		</div>
	</section>
);

const HomePage = () => (
	<div class="home-layout unstyled">
		<HomeHero />
		<HomeDemo />
		<main class="home-main">
			<HomeExplore />
			<HomePath />
		</main>
		<HomeSidebar />
		<HomeFooter />
	</div>
);

export default eco.page({
	layout: BaseLayout,
	metadata: () => ({
		title: 'Schema Engine',
		description:
			'A common language for describing interfaces and processes as JSON, with your own components and actions: a registry, serializable workflows, forms, and React and Radiant renderers.',
		url: '/',
	}),
	render: HomePage,
});
