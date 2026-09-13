import { eco } from '@ecopages/core';
import { DocsLayout } from '@/layouts/docs-layout';
import type { JsxRenderable } from '@ecopages/jsx';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { DocsCodeBlock } from '@/components/docs-code-block';
import { ReactFormPreview } from '@/components/react-form-demo/react-form-preview.react';
import { reactDocsPages } from '@/lib/explicit-docs-pages';
import type { FormConfig } from '@schema-engine/forms/schemas';

/**
 * The exact configuration the live demo renders, declared here so the
 * documented snippet and the interactive demo cannot drift apart.
 */
const contactFormConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: 'Get in touch with our team',
	steps: [
		{
			id: 'step-1',
			title: 'Your Information',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					inputType: 'text',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Invalid email format' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
				},
			],
		},
	],
	view: {
		$type: 'card',
		shell: { padding: 'md', shadowSize: 'md' },
	},
};

const snippetConfig = `const formConfig: FormConfig = {
	id: 'contact-form',
	title: 'Contact Us',
	description: 'Get in touch with our team',
	steps: [
		{
			id: 'step-1',
			title: 'Your Information',
			elements: [
				{
					$type: 'input',
					id: 'name',
					name: 'name',
					label: 'Full Name',
					inputType: 'text',
					rules: [{ type: 'required', message: 'Name is required' }],
				},
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [
						{ type: 'required', message: 'Email is required' },
						{ type: 'email', message: 'Invalid email format' },
					],
				},
				{
					$type: 'textarea',
					id: 'message',
					name: 'message',
					label: 'Message',
					rows: 5,
				},
			],
		},
	],
	view: {
		$type: 'card',
		shell: { padding: 'md', shadowSize: 'md' },
	},
};`;

export default eco.page<Record<string, never>, JsxRenderable>({
	layout: DocsLayout,
	metadata: () => {
		const entry = reactDocsPages['getting-started'];
		return { title: `Docs | ${entry.title}`, description: entry.description };
	},
	dependencies: { components: [ReactFormPreview, DocsBreadcrumb, CopyForLlm, DocsCodeBlock] },
	render: () => {
		const entry = reactDocsPages['getting-started'];
		return (
			<section class="docs-page">
				<div class="docs-bar unstyled">
					<DocsBreadcrumb entry={entry} />
					<CopyForLlm llmUrl={`/llms-content/${entry.slug}.txt`} />
				</div>
				<h1 id="getting-started">Getting Started</h1>
				<p>This guide walks you through building your first React form.</p>
				<p>
					The live example on this page is the exact configuration shown below, rendered with the docs demo
					kit (Radiant UI styling).
				</p>
				<h2 id="live-example">Live example</h2>
				{/* @ts-expect-error - jsx mismatch: React island embedded in EcoPages JSX */}
				<ReactFormPreview config={contactFormConfig} />
				<h2 id="1-create-a-form-engine">1. Create a Form Engine</h2>
				<p>
					Install the form elements and, when using a supplied visual recipe, the recipe source from the
					Schema Engine shadcn registry:
				</p>
				<DocsCodeBlock
					language="bash"
					code={`pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-form andeeplus/schema-engine/schema-engine-form-recipes`}
				/>
				<p>Then import their generated registration barrels:</p>
				<DocsCodeBlock
					language="typescript"
					code={`import { createReactFormEngine } from '@schema-engine/forms-react';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';

const formEngine = createReactFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });`}
				/>
				<h2 id="2-configure-your-form">2. Configure Your Form</h2>
				<p>{"Create a JSON configuration — this page's live demo renders exactly this:"}</p>
				<DocsCodeBlock language="typescript" code={snippetConfig} />
				<h2 id="3-render-the-form">3. Render the Form</h2>
				<DocsCodeBlock
					language="tsx"
					code={`import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/react-hook-form';

function ContactForm() {
	const handleSubmit = (data) => {
		console.log('Form submitted:', data);
	};

	return (
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<FormRenderer config={formConfig} onSubmit={handleSubmit} />
		</FormEngineProvider>
	);
}`}
				/>
				<h2 id="next-steps">Next Steps</h2>
				<ul>
					<li>
						<a href="/docs/forms-react/components">Components</a>
						{' - Pre-built elements with examples'}
					</li>
					<li>
						<a href="/docs/forms-react/layouts">View recipes</a>
						{' - Shells and slot blocks'}
					</li>
				</ul>
			</section>
		);
	},
});
