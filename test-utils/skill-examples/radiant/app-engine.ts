import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';

export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations });
