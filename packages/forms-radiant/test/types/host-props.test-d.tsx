/**
 * Compile-time checks that the `se-*` hosts declare their public props.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import { FormStepElement } from '@/components/form-step';
import { SplitScreenSideElement } from '@/components/shells/shells';

export const typed = <FormStepElement stepIndex={1} />;

// @ts-expect-error -- "stepIdx" is not a prop of the step host
export const misspelled = <FormStepElement stepIdx={1} />;

// @ts-expect-error -- "sideContent" takes a string
export const wrongType = <SplitScreenSideElement sideContent={1} />;
