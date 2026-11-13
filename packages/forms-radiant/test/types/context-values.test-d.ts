/**
 * Compile-time checks that the form contexts state when their value can be absent.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import type { ContextType } from '@ecopages/radiant/context';
import type { FormEngineRuntime } from '@schema-engine/forms/engine/form-engine';
import { formEngineContext } from '../../src/components/provider';
import { formInstanceContext, type FormInstanceContextValue } from '../../src/contexts/form-instance-context';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function assertType<_T extends true>(): void {}

assertType<Equal<ContextType<typeof formInstanceContext>, FormInstanceContextValue | undefined>>();
assertType<Equal<ContextType<typeof formEngineContext>, { engine?: FormEngineRuntime }>>();
