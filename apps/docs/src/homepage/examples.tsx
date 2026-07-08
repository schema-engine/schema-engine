import { codeToHtml } from 'shiki';

export const configExampleCode = `import path from 'node:path';
import { ConfigBuilder } from '@ecopages/core';
import { ecopagesJsxPlugin } from '@ecopages/ecopages-jsx';
import { postcssProcessorPlugin } from '@ecopages/postcss-processor';
import { tailwindV4Preset } from '@ecopages/postcss-processor/presets/tailwind-v4';

const baseUrl = import.meta.env?.ECOPAGES_BASE_URL ?? 'http://localhost:3000';

const config = await new ConfigBuilder()
  .setRootDir(import.meta.dir)
  .setBaseUrl(baseUrl)
  .setDefaultMetadata({
    title: 'Schema Engine Docs',
    description: 'JSON-driven, type-safe forms on top of the Ecopages framework.',
  })
  .setIntegrations([ecopagesJsxPlugin()])
  .setProcessors([
    postcssProcessorPlugin(
      tailwindV4Preset({
        referencePath: path.resolve(import.meta.dir, 'src/styles/app.css'),
      }),
    ),
  ])
  .build();

export default config;`;

export const contactFormConfigCode = `import { createReactFormComposer } from '@schema-engine/forms-react';
import {
  InputElementRegistration,
  TextareaElementRegistration,
  SubmitButtonElementRegistration,
  SubmissionAlertElementRegistration,
} from '@schema-engine/forms-react/registrations';

export const formEngine = createReactFormComposer()
  .addElement(InputElementRegistration)
  .addElement(TextareaElementRegistration)
  .addElement(SubmitButtonElementRegistration)
  .addElement(SubmissionAlertElementRegistration)
  .build();

export const contactFormConfig = {
  id: 'contact-form',
  title: 'Contact Form',
  mode: 'free',
  steps: [
    {
      id: 'contact-step',
      elements: [
        {
          $type: 'submission-alert',
          id: 'status',
          name: 'status',
          showOn: ['pending', 'success'],
          pendingMessage: 'Pending Submission',
          successMessage: 'Submission Successful',
        },
        {
          $type: 'input',
          id: 'email',
          name: 'email',
          inputType: 'email',
          label: 'Email Address',
          rules: [
            { type: 'required', message: 'Email is required' },
            { type: 'email', message: 'Please enter a valid email address' },
          ],
        },
        {
          $type: 'textarea',
          id: 'message',
          name: 'message',
          label: 'Message',
          rules: [
            {
              type: 'minLength',
              value: 10,
              message: 'Message must be at least 10 characters long',
            },
          ],
        },
        {
          $type: 'submit',
          id: 'submit',
          name: 'submit',
          label: 'Submit Form',
        },
      ],
    },
  ],
};`;

export const pageExampleCode = `import { eco } from '@ecopages/core';
import { FormEngineProvider, FormRenderer } from '@schema-engine/forms-react';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';
import { formEngine, contactFormConfig } from './schema.config';
import { BaseLayout } from '@/layouts/base-layout';

const handleSubmit = (data) => {
  console.log('Contact form submitted', { data });
};

export default eco.page({
  layout: BaseLayout,
  metadata: () => ({
    title: 'Welcome to Schema Engine',
    description: 'A JSON-driven form layer on top of the Ecopages framework.',
  }),
  dependencies: {
    components: [FormEngineProvider, FormRenderer],
  },
  render: () => (
    <FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
      <FormRenderer config={contactFormConfig} onSubmit={handleSubmit} />
    </FormEngineProvider>
  ),
});`;

export const configExample = await codeToHtml(configExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

export const contactFormConfigExample = await codeToHtml(contactFormConfigCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

export const pageExample = await codeToHtml(pageExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});
