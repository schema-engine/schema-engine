import { mountFormRenderer as mountLiveForm, rhfAdapter } from '@/lib/forms-react-host';
import type { FormConfig } from '@schema-engine/forms/schemas';
import { formEngine } from '@/lib/form-engine-setup';

export function mountFormRenderer(container: HTMLElement, config: FormConfig) {
	return mountLiveForm(container, {
		engine: formEngine,
		adapter: rhfAdapter,
		config,
	});
}
