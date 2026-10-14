/** Form engine for the default Radiant docs live previews. */
import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { createDocsDemoActions } from '@/lib/docs-demo-actions';
import { installMockFormApi } from '@/lib/mock-form-api';

import '@schema-engine/forms/schemas/validation/validation-registry';

installMockFormApi();

export const formEngine = createRadiantFormEngine({
	elements: schemaFormRegistrations,
	actions: createDocsDemoActions(),
});
