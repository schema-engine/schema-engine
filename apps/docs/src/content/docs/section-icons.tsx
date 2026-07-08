import type { DocsContentPageMeta } from '@/docs-kit/content/docs-site-content.types';
import type { JsxRenderable } from '@ecopages/jsx';

const gettingStartedIcon: JsxRenderable = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M5 12l5 5L20 7" />
	</svg>
);

const formsIcon: JsxRenderable = (
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
		<rect x="3" y="3" width="18" height="18" rx="2" />
		<path d="M9 3v18M3 9h18" />
	</svg>
);

const formsReactIcon: JsxRenderable = (
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
		<circle cx="12" cy="12" r="9" />
		<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
	</svg>
);

const actionsIcon: JsxRenderable = (
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
		<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
	</svg>
);

const registryIcon: JsxRenderable = (
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
		<rect x="3" y="3" width="7" height="7" />
		<rect x="14" y="3" width="7" height="7" />
		<rect x="3" y="14" width="7" height="7" />
		<rect x="14" y="14" width="7" height="7" />
	</svg>
);

const examplesIcon: JsxRenderable = (
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
		<path d="M4 6h16M4 12h16M4 18h16" />
	</svg>
);

const page = (
	slug: string,
	title: string,
	description: string,
	llms = true,
): DocsContentPageMeta => ({ slug, title, description, llms });

/** Docs navigation and page metadata — safe to import from Node CLI scripts. */
export const docsSiteContentMeta = {
	rootDir: '/docs',
	sections: [
		{
			id: 'getting-started',
			title: 'Getting Started',
			icon: gettingStartedIcon,
			pages: [
				page(
					'introduction',
					'Introduction',
					'Why Schema Engine exists and what makes it different from a typical form library.',
				),
				page(
					'installation',
					'Installation',
					'Install the packages you need and configure your first engine instance.',
				),
				page(
					'quick-start',
					'Quick Start',
					'Build your first form with Schema Engine in just a few steps.',
				),
				page(
					'next-steps',
					'Next Steps',
					'Where to go once you have a working form: actions, validation, layouts, examples.',
				),
			],
		},
		{
			id: 'forms',
			title: '@schema-engine/forms',
			icon: formsIcon,
			pages: [
				page('overview', 'Overview', 'Headless form engine: JSON config, validation rules, constraints.'),
				page(
					'getting-started',
					'Getting Started',
					'Install the core engine and learn the shape of a FormConfig.',
				),
				page('core-concepts', 'Core Concepts', 'How Schema Engine parses a config and produces a form.'),
				page('validation', 'Validation', 'Declarative validation rules and Zod schema generation.'),
				page('actions', 'Actions', 'Wire submit, reset, auto-save, notifications, and custom plugins.'),
				page('api-reference', 'API Reference', 'Public surface of @schema-engine/forms.'),
				page(
					'builder',
					'Builder Pattern',
					'Construct a configured engine with the fluent builder API.',
				),
				page(
					'validation-built-in',
					'Built-in Validations',
					'Reference list of every validation rule that ships with the engine.',
				),
				page(
					'validation-custom',
					'Custom Validations',
					'Author your own validation rules and integrate them with the engine.',
				),
				page(
					'validation-how-it-works',
					'Validation Internals',
					'How validation rules are turned into Zod schemas at runtime.',
				),
			],
		},
		{
			id: 'forms-react',
			title: '@schema-engine/forms-react',
			icon: formsReactIcon,
			pages: [
				page(
					'overview',
					'Overview',
					'React adapter: components, layouts, steppers, hooks, RHF bridge.',
				),
				page('getting-started', 'Getting Started', 'Install the React adapter and register your engine.'),
				page('components', 'Components', 'Every element registration that ships with forms-react.'),
				page('layouts', 'Layouts', 'Card, split-screen, and hero-background layouts.'),
				page('steppers', 'Steppers', 'Default, minimalist, and debugger stepper styles.'),
				page('hooks', 'Hooks', 'useFormContext, useField, useActionExecutor, and more.'),
				page('advanced', 'Advanced Usage', 'Patterns for power users: async validation, custom plugins.'),
				page('api-reference', 'API Reference', 'Public surface of @schema-engine/forms-react.'),
			],
		},
		{
			id: 'actions',
			title: '@schema-engine/actions',
			icon: actionsIcon,
			pages: [
				page('overview', 'Overview', 'Domain-agnostic sequential action execution system.'),
				page('getting-started', 'Getting Started', 'Install the actions package and register the first plugin.'),
				page('core-concepts', 'Core Concepts', 'How the dispatcher and the context object compose.'),
				page('advanced', 'Advanced Usage', 'Custom triggers, context, and dispatcher wiring.'),
				page('api-reference', 'API Reference', 'Public surface of @schema-engine/actions.'),
				page('how-it-works', 'How It Works', 'Action lifecycle, dispatch, and error propagation.'),
				page('available-plugins', 'Available Plugins', 'Submit, reset, auto-save, and notification plugins.'),
				page('custom-plugins', 'Custom Plugins', 'Author and register your own action plugins.'),
			],
		},
		{
			id: 'registry',
			title: '@schema-engine/registry',
			icon: registryIcon,
			pages: [
				page('overview', 'Overview', 'The base registry system used by every other package.'),
				page('core-concepts', 'Core Concepts', 'How registration, lookup, and metadata compose.'),
				page('api-reference', 'API Reference', 'Public surface of @schema-engine/registry.'),
				page('examples', 'Examples', 'Standalone patterns for the registry outside of forms.'),
			],
		},
		{
			id: 'examples',
			title: 'Examples',
			icon: examplesIcon,
			pages: [
				page('basic-form', 'Basic Form', 'A minimal contact form built from a JSON config.'),
				page('contact-form', 'Contact Form', 'Conditional fields, multi-column layout, validation.'),
				page(
					'registration-flow',
					'Registration Flow',
					'Multi-step registration with progress and per-step validation.',
				),
				page('survey-form', 'Survey Form', 'Branching survey with conditional logic and rich inputs.'),
				page(
					'sequential-actions',
					'Sequential Actions',
					'Compose submit, notification, and analytics actions in a chain.',
				),
			],
		},
	],
};
