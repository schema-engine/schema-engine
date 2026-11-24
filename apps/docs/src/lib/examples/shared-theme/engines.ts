import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { brandTheme } from './theme';

export const checkoutEngine = createRadiantFormEngine({ elements: schemaFormRegistrations, layout: brandTheme });
export const profileEngine = createRadiantFormEngine({ elements: schemaFormRegistrations, layout: brandTheme });
