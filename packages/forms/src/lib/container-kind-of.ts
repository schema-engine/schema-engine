import type { AnyElementRegistration, ContainerKind } from '@/types/registration';

/**
 * The container semantics an element registration declares: only an input can hold children, so a static element has none.
 */
export function containerKindOf(registration: AnyElementRegistration | undefined): ContainerKind | undefined {
	return registration?.kind === 'input' ? registration.containerKind : undefined;
}
