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
 * For development convenience, you can import this file to get all elements:
 *
 * @example
 * ```typescript
 * // Development import (includes all fields)
 * import "../components/form/registries";
 * ```
 */

import '../_fields/input-field.registry';
import '../_fields/textarea-field.registry';
import '../_fields/select-field.registry';
import '../_fields/checkbox-field.registry';
import '../_fields/number-field.registry';
import '../_fields/array-field.registry';
