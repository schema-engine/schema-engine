import { eco } from '@ecopages/core';
import { DocsLayout } from '@/layouts/docs-layout';
import type { JsxRenderable } from '@ecopages/jsx';
import { CopyForLlm } from '@/components/copy-for-llm';
import { DocsBreadcrumb } from '@/components/docs-breadcrumb';
import { DocsCodeBlock } from '@/components/docs-code-block';
import { DefaultRecipeSources } from '@/components/default-recipe-sources';
import { ReactFormPreview } from '@/components/react-form-demo/react-form-preview.react';
import { reactDocsPages } from '@/lib/explicit-docs-pages';
import type { FormConfig } from '@schema-engine/forms/schemas';

const entry = reactDocsPages['layouts'];

/**
 * The exact configuration the multi-step demo renders, declared here so the
 * documented snippet and the interactive demo cannot drift apart.
 */
const onboardingFormConfig: FormConfig = {
	id: 'onboarding',
	title: 'Create your account',
	view: { $type: 'wizard' },
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{
					$type: 'input',
					id: 'email',
					name: 'email',
					label: 'Email Address',
					inputType: 'email',
					rules: [{ type: 'required', message: 'Email is required' }],
				},
				{
					$type: 'input',
					id: 'password',
					name: 'password',
					label: 'Password',
					inputType: 'password',
					rules: [
						{ type: 'required', message: 'Password is required' },
						{ type: 'minLength', value: 8, message: 'Use at least 8 characters' },
					],
				},
			],
		},
		{
			id: 'profile',
			title: 'Profile',
			elements: [
				{
					$type: 'select',
					id: 'role',
					name: 'role',
					label: 'Role',
					placeholder: 'Select your role',
					rules: [{ type: 'required', message: 'Role is required' }],
					options: [
						{ value: 'developer', label: 'Developer' },
						{ value: 'designer', label: 'Designer' },
						{ value: 'product', label: 'Product Manager' },
					],
				},
				{
					$type: 'checkbox',
					id: 'newsletter',
					name: 'newsletter',
					label: 'Newsletter',
					description: 'Optional. Send me product updates.',
				},
			],
		},
	],
};

const snippetConfig = `const formConfig: FormConfig = {
	id: 'onboarding',
	title: 'Create your account',
	view: { $type: 'wizard' },
	steps: [
		{
			id: 'account',
			title: 'Account',
			elements: [
				{ $type: 'input', id: 'email', name: 'email', label: 'Email Address', inputType: 'email', rules: [{ type: 'required', message: 'Email is required' }] },
				{ $type: 'input', id: 'password', name: 'password', label: 'Password', inputType: 'password', rules: [{ type: 'required', message: 'Password is required' }] },
			],
		},
		{
			id: 'profile',
			title: 'Profile',
			elements: [
				{
					$type: 'select',
					id: 'role',
					name: 'role',
					label: 'Role',
					placeholder: 'Select your role',
					rules: [{ type: 'required', message: 'Role is required' }],
					options: [
						{ value: 'developer', label: 'Developer' },
						{ value: 'designer', label: 'Designer' },
						{ value: 'product', label: 'Product Manager' },
					],
				},
				{
					$type: 'checkbox',
					id: 'newsletter',
					name: 'newsletter',
					label: 'Newsletter',
					description: 'Optional. Send me product updates.',
				},
			],
		},
	],
};`;

export default eco.page<Record<string, never>, JsxRenderable>({
	layout: DocsLayout,
	metadata: () => ({ title: `Docs | ${entry.title}`, description: entry.description }),
	dependencies: { components: [ReactFormPreview, DocsBreadcrumb, CopyForLlm, DocsCodeBlock, DefaultRecipeSources] },
	render: () => (
		<section class="docs-page">
			<div class="docs-bar unstyled">
				<DocsBreadcrumb entry={entry} />
				<CopyForLlm llmUrl={`/llms-content/${entry.slug}.txt`} />
			</div>
			<h1 id="view-recipes">View recipes</h1>
			<p>
				Recipes compose a <strong>shell</strong> with optional <strong>header</strong>,{' '}
				<strong>progress</strong>, and <strong>actions</strong> blocks. Select one with form-level{' '}
				<code>view.$type</code>. <code>@schema-engine/forms-react</code> is headless: the factory does not bind
				default recipes. <code>FormRenderer</code> still lives in the package.
			</p>
			<div class="overflow-x-auto table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Layer</th>
							<th>Owns</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>@schema-engine/forms/recipes</code>
							</td>
							<td>
								Specs, kinds, slot schemas, <code>defineFormRecipe</code>
							</td>
						</tr>
						<tr>
							<td>
								<code>schema-engine-form-recipes</code> (shadcn registry)
							</td>
							<td>
								React shells, blocks, <code>schemaFormRecipeRegistrations</code>
							</td>
						</tr>
						<tr>
							<td>
								<code>@schema-engine/forms-radiant</code>
							</td>
							<td>
								Radiant shells and blocks, auto-bound by <code>createRadiantFormEngine()</code>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<h2 id="default-registry-recipes">Default registry recipes</h2>
			<p>Install the default source owned by your app:</p>
			<DocsCodeBlock
				language="bash"
				code={`pnpm dlx shadcn@latest add andeeplus/schema-engine/schema-engine-form-recipes`}
			/>
			<p>Then add its generated recipe barrel when you construct the engine:</p>
			<DocsCodeBlock
				language="ts"
				code={`import { createReactFormEngine } from '@schema-engine/forms-react';
import { schemaFormRecipeRegistrations } from '@/components/schema-engine/forms/recipes/registrations';
import { schemaFormRegistrations } from '@/components/schema-engine/forms/registrations';

const engine = createReactFormEngine({ elements: schemaFormRegistrations, recipes: schemaFormRecipeRegistrations });`}
			/>
			<div class="overflow-x-auto table-wrapper">
				<table>
					<thead>
						<tr>
							<th>
								<code>$type</code>
							</th>
							<th>Kind</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>card</code>
							</td>
							<td>single-step</td>
							<td>Centered card shell</td>
						</tr>
						<tr>
							<td>
								<code>split-screen</code>
							</td>
							<td>single-step</td>
							<td>Side panel plus form</td>
						</tr>
						<tr>
							<td>
								<code>hero-background</code>
							</td>
							<td>single-step</td>
							<td>Hero image or video</td>
						</tr>
						<tr>
							<td>
								<code>bare-controls</code>
							</td>
							<td>wizard</td>
							<td>Previous / next / submit only</td>
						</tr>
						<tr>
							<td>
								<code>card-wizard</code>
							</td>
							<td>wizard</td>
							<td>Card shell with progress</td>
						</tr>
						<tr>
							<td>
								<code>wizard</code>
							</td>
							<td>wizard</td>
							<td>Horizontal step indicators</td>
						</tr>
						<tr>
							<td>
								<code>sidebar-wizard</code>
							</td>
							<td>wizard</td>
							<td>Step indicators in a sidebar</td>
						</tr>
						<tr>
							<td>
								<code>hero-wizard</code>
							</td>
							<td>wizard</td>
							<td>Wizard over a hero background</td>
						</tr>
						<tr>
							<td>
								<code>split-screen-wizard</code>
							</td>
							<td>wizard</td>
							<td>Wizard with a marketing side panel</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p>
				Slot config is optional. The recipe fixes block identity; <code>view</code> only passes options such as{' '}
				<code>shell</code>, <code>header</code>, <code>progress</code>, and <code>actions</code>.
			</p>
			<h2 id="single-step">Single-step</h2>
			<p>
				Single-step recipes render a submit-only actions bar below the fields (aligned with the
				<code>actions.align</code> slot config), so the form is submittable without wizard navigation:
			</p>
			<DocsCodeBlock
				language="typescript"
				code={`const formConfig: FormConfig = {
	id: 'contact',
	view: {
		$type: 'card',
		shell: { maxWidth: 'md', padding: 'lg', shadowSize: 'md' },
	},
	steps: [{ id: 'step-1', title: 'Contact', elements: [/* ... */] }],
};`}
			/>
			<h2 id="multi-step">Multi-step</h2>
			<p>
				Wizard recipes require <strong>at least two steps</strong>. Set <code>view.$type</code> to a wizard
				recipe such as <code>wizard</code> or <code>card-wizard</code>. The live demo renders exactly the
				configuration below:
			</p>
			{/* @ts-expect-error - jsx mismatch: React island embedded in EcoPages JSX */}
			<ReactFormPreview config={onboardingFormConfig} />
			<DocsCodeBlock language="typescript" code={snippetConfig} />
			<p>
				If you omit <code>view.$type</code> on a multi-step form, the engine uses the registered{' '}
				<code>bare-controls</code> recipe. If that recipe is not registered, fields render without chrome and
				the renderer warns once per engine.
			</p>
			<p>
				See <a href="/docs/examples/registration-flow">Registration Flow</a> for a full wizard configuration.
			</p>
			<h2 id="copy-the-default-source">Copy the default source</h2>
			<p>
				Canonical source is <code>registry/shared/forms/recipes</code>. After <code>shadcn add</code>, files
				land under <code>@/components/schema-engine/forms/recipes</code>. Copy <code>recipe-registry.ts</code>{' '}
				once, then the files for each recipe you want. Each tab has a copy button.
			</p>
			<DefaultRecipeSources />
			<h2 id="custom-recipes">Custom recipes</h2>
			<DocsCodeBlock
				language="typescript"
				code={`import * as z from 'zod/mini';
import { createReactFormEngine } from '@schema-engine/forms-react';
import { defineFormRecipe } from '@schema-engine/forms/recipes';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';

function BrandShell({ slots }: FormShellProps) {
	return (
		<div>
			{slots.header}
			{slots.content}
			{slots.actions}
		</div>
	);
}

const BrandRecipe = defineFormRecipe(
	defineRecipeSpec({
		$type: 'brand',
		kind: 'single-step',
		slotSchemas: { shell: z.strictObject({ accent: z.optional(z.string()) }) },
		metadata: { name: 'Brand', description: 'Branded form shell' },
	}),
	{ shell: BrandShell, slots: {} },
);

const engine = createReactFormEngine({ recipes: [BrandRecipe] });`}
			/>
		</section>
	),
});
