/**
 * Every default element contract has a registration in `schemaFormRegistrations`, and no registration has a `$type` of its own.
 *
 * Each registration module binds its own contract, so nothing else makes the compiler fail when a contract is added without a binding.
 * Run via: pnpm check-types (tsconfig.test-types.json)
 */

import type { defaultElementContracts } from '@schema-engine/forms/default-elements';
import { expectTypeOf } from 'vitest';
import type { schemaFormRegistrations } from '@/registrations';

type ContractTypes = ReturnType<(typeof defaultElementContracts)['all']>[number]['$type'];
type RegistrationTypes = (typeof schemaFormRegistrations)[number]['$type'];

expectTypeOf<RegistrationTypes>().toEqualTypeOf<ContractTypes>();
