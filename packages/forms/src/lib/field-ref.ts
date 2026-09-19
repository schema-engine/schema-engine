/**
 * Resolves a field reference written on `fieldPath` to an absolute value path.
 *
 * @remarks
 * A bare name is a sibling: `accountType` written on `contacts.0.email` resolves
 * to `contacts.0.accountType`, and on `address.street` to `address.accountType`.
 * A reference that already contains a dot is absolute from the form root, so
 * `billing.country` means the same field wherever it is written.
 *
 * Constraints and cross-field validation ask the same question of an authored
 * name, so they share one answer here; two implementations drifted once already.
 */
export function resolveFieldRef(fieldRef: string, fieldPath?: string): string {
	if (!fieldPath || fieldRef.includes('.')) {
		return fieldRef;
	}

	const parts = fieldPath.split('.');
	const last = parts[parts.length - 1];
	if (!Number.isNaN(Number(last))) {
		return `${fieldPath}.${fieldRef}`;
	}

	parts.pop();
	const parentPath = parts.join('.');
	return parentPath ? `${parentPath}.${fieldRef}` : fieldRef;
}
