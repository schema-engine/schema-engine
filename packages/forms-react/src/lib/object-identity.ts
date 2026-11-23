const identities = new WeakMap<object, number>();
let nextIdentity = 0;

/**
 * A number that names an object for as long as it lives, to use as a React `key`.
 *
 * @remarks A form instance lives as long as the identities of its normalized config and its engine do not change.
 */
export function getObjectIdentity(value: object): number {
	const existing = identities.get(value);
	if (existing !== undefined) return existing;
	const identity = nextIdentity++;
	identities.set(value, identity);
	return identity;
}
