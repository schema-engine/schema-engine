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
    title: 'Schema Engine',
    description: 'TypeScript-first, JSON-driven forms on top of Ecopages',
  })
  .setIntegrations([ecopagesJsxPlugin()])
  .setProcessors([
    postcssProcessorPlugin(
      tailwindV4Preset({
        referencePath: path.resolve(import.meta.dir, 'src/styles/app.css'),
      })
    ),
  ])
  .build();

export default config;`;

export const componentExampleCode = `import { eco } from '@ecopages/core';
import { InputElementRegistration } from '@schema-engine/forms-react/registrations';

type ContactFormConfig = {
  id: string;
  steps: Array<{ elements: unknown[] }>;
};

export const config: ContactFormConfig = {
  id: 'contact-form',
  steps: [
    {
      elements: [
        {
          $type: 'input',
          id: 'email',
          name: 'email',
          label: 'Email Address',
          inputType: 'email',
          rules: [{ rule: 'required', message: 'Email is required' }],
        },
      ],
    },
  ],
};

export const Form = () => <form-config data={config} />;`;

export const pageExampleCode = `import { eco } from '@ecopages/core';
import { BaseLayout } from '@/layouts/base-layout';
import { CodeTabs } from '@/components/code-tabs';

export default eco.page({
  layout: BaseLayout,
  metadata: () => ({
    title: 'Welcome to Schema Engine',
    description: 'A JSON-driven form layer on top of the Ecopages framework.',
  }),
  dependencies: { components: [CodeTabs] },
  render: () => (
    <section class="not-prose">
      <h1>Build forms from JSON, ship faster</h1>
      <p>
        Schema Engine turns form definitions into a single source of truth: type-safe,
        Zod-validated, and powered by your existing component library.
      </p>
      <a href="/docs/getting-started/introduction">Read the docs</a>
    </section>
  ),
});`;

export const configExample = await codeToHtml(configExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

export const componentExample = await codeToHtml(componentExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});

export const pageExample = await codeToHtml(pageExampleCode, {
	lang: 'tsx',
	themes: { light: 'light-plus', dark: 'dark-plus' },
	defaultColor: false,
});
