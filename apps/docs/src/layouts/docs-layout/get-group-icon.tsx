import type { JsxRenderable } from '@ecopages/jsx';
import type { DocsGroupName } from '@/content/docs';

const GroupIcon = ({ children, size = 16 }: { children: JsxRenderable; size?: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{children}
	</svg>
);

const GROUP_ICONS = {
	'Getting Started': () => (
		<GroupIcon size={20}>
			<path d="M5 12l5 5L20 7" />
		</GroupIcon>
	),
	Forms: () => (
		<GroupIcon>
			<rect x="3" y="4" width="18" height="16" rx="2" />
			<path d="M7 8h10M7 12h10M7 16h6" />
		</GroupIcon>
	),
	'Forms React': () => (
		<GroupIcon>
			<circle cx="12" cy="12" r="2" />
			<path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20" />
		</GroupIcon>
	),
	Actions: () => (
		<GroupIcon>
			<polygon points="5 4 19 12 5 20 5 4" />
		</GroupIcon>
	),
	Registry: () => (
		<GroupIcon>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="7" height="7" rx="1" />
		</GroupIcon>
	),
	Examples: () => (
		<GroupIcon>
			<path d="M4 6h16M4 12h16M4 18h16" />
		</GroupIcon>
	),
} as const satisfies Record<DocsGroupName, () => JsxRenderable>;

export const getGroupIcon = (name: string): JsxRenderable => {
	if (name in GROUP_ICONS) {
		return GROUP_ICONS[name as DocsGroupName]();
	}

	return null;
};
