import type { DocsSiteContent } from '@/docs-kit/content/docs-site-content.types';

import { attachDocsContentModules } from './attach-docs-content-modules';
import { docsSiteContentMeta } from './content.meta';
import GettingStartedIntroduction from './getting-started/introduction.mdx';
import GettingStartedInstallation from './getting-started/installation.mdx';
import GettingStartedQuickStart from './getting-started/quick-start.mdx';
import GettingStartedNextSteps from './getting-started/next-steps.mdx';

import FormsOverview from './forms/overview.mdx';
import FormsGettingStarted from './forms/getting-started.mdx';
import FormsCoreConcepts from './forms/core-concepts.mdx';
import FormsValidation from './forms/validation.mdx';
import FormsActions from './forms/actions.mdx';
import FormsApiReference from './forms/api-reference.mdx';
import FormsBuilder from './forms/builder.mdx';
import FormsValidationBuiltIn from './forms/validation-built-in.mdx';
import FormsValidationCustom from './forms/validation-custom.mdx';
import FormsValidationHowItWorks from './forms/validation-how-it-works.mdx';

import FormsReactOverview from './forms-react/overview.mdx';
import FormsReactGettingStarted from './forms-react/getting-started.mdx';
import FormsReactComponents from './forms-react/components.mdx';
import FormsReactLayouts from './forms-react/layouts.mdx';
import FormsReactSteppers from './forms-react/steppers.mdx';
import FormsReactHooks from './forms-react/hooks.mdx';
import FormsReactAdvanced from './forms-react/advanced.mdx';
import FormsReactApiReference from './forms-react/api-reference.mdx';

import ActionsOverview from './actions/overview.mdx';
import ActionsGettingStarted from './actions/getting-started.mdx';
import ActionsCoreConcepts from './actions/core-concepts.mdx';
import ActionsAdvanced from './actions/advanced.mdx';
import ActionsApiReference from './actions/api-reference.mdx';
import ActionsHowItWorks from './actions/how-it-works.mdx';
import ActionsAvailablePlugins from './actions/available-plugins.mdx';
import ActionsCustomPlugins from './actions/custom-plugins.mdx';

import RegistryOverview from './registry/overview.mdx';
import RegistryCoreConcepts from './registry/core-concepts.mdx';
import RegistryApiReference from './registry/api-reference.mdx';
import RegistryExamples from './registry/examples.mdx';

import ExampleBasicForm from './examples/basic-form.mdx';
import ExampleContactForm from './examples/contact-form.mdx';
import ExampleRegistrationFlow from './examples/registration-flow.mdx';
import ExampleSurveyForm from './examples/survey-form.mdx';
import ExampleSequentialActions from './examples/sequential-actions.mdx';

/** Docs navigation, metadata, and MDX modules — single source of truth. */
export const docsSiteContent = attachDocsContentModules(docsSiteContentMeta, {
	'getting-started/introduction': GettingStartedIntroduction,
	'getting-started/installation': GettingStartedInstallation,
	'getting-started/quick-start': GettingStartedQuickStart,
	'getting-started/next-steps': GettingStartedNextSteps,

	'forms/overview': FormsOverview,
	'forms/getting-started': FormsGettingStarted,
	'forms/core-concepts': FormsCoreConcepts,
	'forms/validation': FormsValidation,
	'forms/actions': FormsActions,
	'forms/api-reference': FormsApiReference,
	'forms/builder': FormsBuilder,
	'forms/validation-built-in': FormsValidationBuiltIn,
	'forms/validation-custom': FormsValidationCustom,
	'forms/validation-how-it-works': FormsValidationHowItWorks,

	'forms-react/overview': FormsReactOverview,
	'forms-react/getting-started': FormsReactGettingStarted,
	'forms-react/components': FormsReactComponents,
	'forms-react/layouts': FormsReactLayouts,
	'forms-react/steppers': FormsReactSteppers,
	'forms-react/hooks': FormsReactHooks,
	'forms-react/advanced': FormsReactAdvanced,
	'forms-react/api-reference': FormsReactApiReference,

	'actions/overview': ActionsOverview,
	'actions/getting-started': ActionsGettingStarted,
	'actions/core-concepts': ActionsCoreConcepts,
	'actions/advanced': ActionsAdvanced,
	'actions/api-reference': ActionsApiReference,
	'actions/how-it-works': ActionsHowItWorks,
	'actions/available-plugins': ActionsAvailablePlugins,
	'actions/custom-plugins': ActionsCustomPlugins,

	'registry/overview': RegistryOverview,
	'registry/core-concepts': RegistryCoreConcepts,
	'registry/api-reference': RegistryApiReference,
	'registry/examples': RegistryExamples,

	'examples/basic-form': ExampleBasicForm,
	'examples/contact-form': ExampleContactForm,
	'examples/registration-flow': ExampleRegistrationFlow,
	'examples/survey-form': ExampleSurveyForm,
	'examples/sequential-actions': ExampleSequentialActions,
}) satisfies DocsSiteContent;

export { docsSiteContentMeta } from './content.meta';
