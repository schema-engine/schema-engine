import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { BaseLayout } from '@/layouts/base-layout';
import { CodeTabs } from '@/components/code-tabs';
import {
	configExample,
	configExampleCode,
	contactFormConfigExample,
	contactFormConfigCode,
	pageExample,
	pageExampleCode,
} from '@/homepage/examples';
import { unsafeHtml } from '@ecopages/jsx/jsx-runtime';

const HomeCard = ({
	href,
	label,
	title,
	description,
}: {
	href: string;
	label: string;
	title: string;
	description: string;
}) => (
	<a href={href} class="home-card group">
		<article>
			<p class="home-card__label">{label}</p>
			<h1 class="home-card__title">{title}</h1>
			<p class="home-card__text">{description}</p>
		</article>
	</a>
);

const HomePathCard = ({ href, title, description }: { href: string; title: string; description: string }) => (
	<a
		href={href}
		class="flex flex-col gap-1 rounded-sm border border-border bg-background p-4 text-on-background no-underline transition-colors hover:bg-secondary-container/30"
	>
		<p class="text-sm font-semibold">{title}</p>
		<p class="text-sm text-on-background/70">{description}</p>
	</a>
);

const LiveDemo = () => (
	<div class="home-demo">
		<div class="home-demo__header">
			<div class="home-demo__dots" aria-hidden="true">
				<span class="home-demo__dot home-demo__dot--red" />
				<span class="home-demo__dot home-demo__dot--yellow" />
				<span class="home-demo__dot home-demo__dot--green" />
			</div>
			<p class="home-demo__label">Live preview — contact-form.json</p>
		</div>
		<div class="home-demo__body">
			<div class="home-demo__placeholder">
				<p class="home-demo__placeholder-title">Rendered form lives in the /www app</p>
				<p class="home-demo__placeholder-text">
					The same JSON config drives a real <code>&lt;FormRenderer /&gt;</code> in the React app. Open
					any of the <a href="/docs/examples/basic-form">examples</a> for the live form.
				</p>
				<a href="/docs/examples/contact-form" class="button button--default home-demo__placeholder-cta">
					See a live example
				</a>
			</div>
		</div>
	</div>
);

const CodeSample = () => (
	<div class="home-demo">
		<div class="home-demo__header">
			<div class="home-demo__dots" aria-hidden="true">
				<span class="home-demo__dot home-demo__dot--red" />
				<span class="home-demo__dot home-demo__dot--yellow" />
				<span class="home-demo__dot home-demo__dot--green" />
			</div>
			<p class="home-demo__label">contact-form.json</p>
		</div>
		<div class="home-demo__body home-demo__body--code">
			<pre class="home-demo__code">
				<code>{`{
  "id": "contact-form",
  "title": "Contact Form",
  "mode": "free",
  "steps": [
    {
      "id": "contact-step",
      "elements": [
        {
          "$type": "input",
          "id": "email",
          "name": "email",
          "inputType": "email",
          "label": "Email Address",
          "rules": [
            { "type": "required", "message": "Email is required" },
            { "type": "email", "message": "Please enter a valid email address" }
          ]
        },
        {
          "$type": "textarea",
          "id": "message",
          "name": "message",
          "label": "Message",
          "rules": [
            { "type": "minLength", "value": 10,
              "message": "Message must be at least 10 characters long" }
          ]
        },
        { "$type": "submit", "name": "submit", "label": "Submit Form" }
      ]
    }
  ]
}`}</code>
			</pre>
		</div>
	</div>
);

export default eco.page<{}, JsxRenderable>({
	layout: BaseLayout,
	dependencies: {
		components: [CodeTabs],
		stylesheets: ['./index.css'],
	},
	metadata: () => ({
		title: 'Schema Engine',
		description:
			'A JSON-driven form layer on top of the Ecopages framework. Type-safe, Zod-validated, framework-agnostic.',
	}),
	render: () => (
		<div class="home-layout not-prose">
			<header class="home-header">
				<div class="home-hero">
					<div class="home-hero__text">
						<p class="home-header__subtitle">Schema Engine</p>
						<h1 class="home-header__title">
							JSON-driven forms, type-safe by construction.
						</h1>
						<p class="home-header__description">
							Define forms in JSON, get Zod validation and React components for free. Powered by{' '}
							<a href="https://ecopages.app" target="_blank" rel="noopener">
								Ecopages
							</a>
							, used across four first-party packages: <code>forms</code>, <code>forms-react</code>,{' '}
							<code>actions</code>, and <code>registry</code>.
						</p>

						<CodeTabs
							label="Package managers"
							tabs={[
								{
									id: 'bun',
									label: 'bun',
									code: 'bunx ecopages init my-app && cd my-app && bun install && bun dev',
								},
								{
									id: 'pnpm',
									label: 'pnpm',
									code: 'pnpm dlx ecopages init my-app && cd my-app && pnpm install && pnpm dev',
								},
								{
									id: 'npm',
									label: 'npm',
									code: 'npx ecopages init my-app && cd my-app && npm install && npm run dev',
								},
							]}
							copyLabel="Copy init command"
							defaultSelectedKey="bun"
						/>

						<div class="home-header__actions">
							<a href="/docs/getting-started/introduction" class="button button--default">
								Read introduction
							</a>
							<a href="/docs/getting-started/installation" class="button button--outline">
								See installation
							</a>
						</div>
					</div>

					<div class="home-hero__code">
						<CodeTabs
							label="Starter files"
							tabs={[
								{
									id: 'eco-config',
									label: 'eco.config.ts',
									code: (
										<figure data-rehype-pretty-code-figure class="home-code-block">
											{unsafeHtml(configExample)}
										</figure>
									),
									content: configExampleCode,
								},
								{
									id: 'contact-config',
									label: 'contact-form.json',
									code: (
										<figure data-rehype-pretty-code-figure class="home-code-block">
											{unsafeHtml(contactFormConfigExample)}
										</figure>
									),
									content: contactFormConfigCode,
								},
								{
									id: 'page-example',
									label: 'src/pages/index.tsx',
									code: (
										<figure data-rehype-pretty-code-figure class="home-code-block">
											{unsafeHtml(pageExample)}
										</figure>
									),
									content: pageExampleCode,
								},
							]}
							copyLabel="Copy source"
							defaultSelectedKey="eco-config"
						/>
					</div>
				</div>
			</header>

			<section class="home-demo-section">
				<div class="home-demo-section__intro">
					<p class="home-card__label">Same JSON, same code, real form</p>
					<h2 class="home-demo-section__title">A working form, end to end</h2>
					<p class="home-demo-section__lede">
						On the left, a real <code>&lt;FormRenderer /&gt;</code> driven by the JSON config on the
						right. The config is the source of truth: change it and the form changes with it, no JSX
						rewrites.
					</p>
				</div>
				<div class="home-demo-section__grid">
					<LiveDemo />
					<CodeSample />
				</div>
			</section>

			<main class="home-main">
				<section>
					<div class="home-cards">
						<HomeCard
							href="/docs/getting-started/introduction"
							label="Get Started"
							title="Schema-driven from day one"
							description="Define forms in JSON, get Zod validation, real components, and full type safety without writing JSX."
						/>
						<HomeCard
							href="/docs/forms"
							label="Core"
							title="Framework-agnostic engine"
							description="The forms package is the headless core. Pluggable adapters, no opinions on UI."
						/>
						<HomeCard
							href="/docs/forms-react"
							label="React"
							title="Production-ready React layer"
							description="React Hook Form-backed components, layouts, steppers, and a strict builder pattern."
						/>
						<HomeCard
							href="/docs/actions"
							label="Actions"
							title="Sequential action system"
							description="Compose submit, reset, auto-save, GTM, and notifications as registered plugins."
						/>
					</div>
				</section>

				<section class="home-path">
					<p class="home-card__label">Suggested Path</p>
					<ol class="home-path__list">
						<li>Read the introduction to understand the philosophy and the engine.</li>
						<li>Install the packages you need and configure the React adapter.</li>
						<li>Define your first form config and render it with FormRenderer.</li>
						<li>Layer in actions, validation rules, and custom layouts.</li>
						<li>Read the API reference for the package you are extending.</li>
					</ol>

					<div class="mt-8 grid gap-3">
						<HomePathCard
							href="/docs/getting-started/installation"
							title="Install and configure"
							description="Add forms and forms-react to your project and register the engine."
						/>
						<HomePathCard
							href="/docs/forms/builder"
							title="Use the builder pattern"
							description="Construct your engine once with createReactFormComposer, then addElement / addAction as your app grows."
						/>
						<HomePathCard
							href="/docs/examples/basic-form"
							title="Explore the examples"
							description="Basic, contact, registration, survey, and sequential-action forms — all real configs you can copy."
						/>
					</div>
				</section>
			</main>

			<aside class="home-sidebar">
				<div class="home-sidebar__section">
					<p class="home-sidebar__label">Repository</p>
					<a
						href="https://github.com/andeeplus/schema-engine"
						class="home-sidebar__value home-sidebar__link"
					>
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
							<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
						</svg>
						andeeplus/schema-engine
					</a>
				</div>

				<div class="home-sidebar__section">
					<p class="home-sidebar__label">License</p>
					<p class="home-sidebar__value">
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
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
						</svg>
						MIT
					</p>
				</div>

				<div class="home-sidebar__section">
					<p class="home-sidebar__label">For agents</p>
					<div class="home-sidebar__tags">
						<a href="/skill.txt" class="home-sidebar__tag">
							skill.txt
						</a>
						<a href="/skill/SKILL.md" class="home-sidebar__tag">
							SKILL.md
						</a>
						<a href="/llms.txt" class="home-sidebar__tag">
							llms.txt
						</a>
					</div>
				</div>

				<div class="home-sidebar__section">
					<p class="home-sidebar__label">Packages</p>
					<div class="home-sidebar__tags">
						<span class="home-sidebar__tag">forms</span>
						<span class="home-sidebar__tag">forms-react</span>
						<span class="home-sidebar__tag">actions</span>
						<span class="home-sidebar__tag">registry</span>
					</div>
				</div>
			</aside>
		</div>
	),
});
