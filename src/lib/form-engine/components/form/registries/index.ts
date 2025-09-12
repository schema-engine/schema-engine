/**
 * Development utility: Import all field registries
 *
 * For production tree-shaking, import only the specific registries you need:
 *
 * @example
 * ```typescript
 * // Tree-shakable imports
 * import "../components/form/fields/input-field.registry";
 * import "../components/form/fields/select-field.registry";
 * ```
 *
 * For development convenience, you can import this file to get all fields:
 *
 * @example
 * ```typescript
 * // Development import (includes all fields)
 * import "../components/form/registries";
 * ```
 */

import '../fields/input-field.registry';
import '../fields/textarea-field.registry';
import '../fields/select-field.registry';
import '../fields/checkbox-field.registry';
import '../fields/number-field.registry';
import '../fields/array-field.registry';
