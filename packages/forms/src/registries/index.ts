import type { ReadOnlyRegistry } from '@schema-engine/registry';
import type { AnyActionRegistration, AnyElementRegistration, AnyRecipeRegistration } from '@/types/registration';

/** The engine's read-only store of element registrations. */
export type ElementRegistry = ReadOnlyRegistry<AnyElementRegistration>;

/** The engine's read-only store of view recipe registrations. */
export type RecipeRegistry = ReadOnlyRegistry<AnyRecipeRegistration>;

/** The engine's read-only store of action registrations. */
export type ActionRegistrationRegistry = ReadOnlyRegistry<AnyActionRegistration>;
