export type AdjacentNavLink = {
	href: string;
	title: string;
};

export function findAdjacentNavItems<T extends AdjacentNavLink>(
	items: readonly T[],
	href: string,
): { prev: T | null; next: T | null } | null {
	const currentIndex = items.findIndex((item) => item.href === href);
	if (currentIndex === -1) {
		return null;
	}

	return {
		prev: currentIndex > 0 ? items[currentIndex - 1]! : null,
		next: currentIndex < items.length - 1 ? items[currentIndex + 1]! : null,
	};
}
