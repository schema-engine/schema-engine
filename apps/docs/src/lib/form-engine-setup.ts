/** Form engine for the Radiant docs live previews. */
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';
import { installMockFormApi } from '@/lib/mock-form-api';
import { theme } from '@/lib/examples/theming/theme';

installMockFormApi();

/**
 * The docs engine. It runs on the compiled theme of the themed form example, so every preview of the site
 * carries one `data-se-theme` and the host `tone` axis is available everywhere.
 */
export const formEngine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	actions: createDocsDemoActions(),
	layout: theme,
});
