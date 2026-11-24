import { createRadiantFormEngine, schemaFormRegistrations } from '@schema-engine/forms-radiant';
import { theme } from './theme';

/**
 * A Radiant engine built on the compiled theme.
 *
 * @remarks
 * Compile the theme once and pass the same object as `layout` to every engine, whatever its renderer: each form then
 * carries one `data-se-theme` and the same stylesheet. A React engine takes it the same way, as
 * `createFormEngine({ elements, layout: theme })`.
 */
export const engine = createRadiantFormEngine({ elements: schemaFormRegistrations, layout: theme });
