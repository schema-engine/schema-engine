import '@ecopages/radiant/client/install-hydrator';
import { expect } from 'vitest';
import { FormController } from '@/adapters/radiant/controller';
import { createRoot } from '@ecopages/jsx/client';
import { rendererConformance, conformanceAction } from '../../../../test-utils/renderer-conformance';
import { FormRenderer } from '@/components/internals/form-renderer';
import { createRadiantFormEngine } from '@/registries/builder-registry';
import { schemaFormRegistrations } from '@/registrations';

const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, actions: [conformanceAction] });

rendererConformance(async ({ config, ...props }) => {
	const host = document.createElement('div');

	document.body.append(host);
	const root = createRoot(host);
	root.render(FormRenderer({ ...props, config: engine.validateForm(config), engine }));
	const form = new FormController(host.querySelector('rui-form')!);
	await expect.poll(() => form.ready).toBe(true);
	return {
		host,
		cleanup: () => {
			form.disconnect();
			root.unmount();
			host.remove();
		},
	};
});
