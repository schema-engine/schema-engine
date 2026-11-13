import type { JsxRenderable } from '@ecopages/jsx';

const SectionIcon = ({ children, size = 16 }: { children: JsxRenderable; size?: number }) => (
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
		aria-hidden="true"
	>
		{children}
	</svg>
);

export const gettingStartedIcon: JsxRenderable = (
	<SectionIcon size={20}>
		<path d="M5 12l5 5L20 7" />
	</SectionIcon>
);

export const formsIcon: JsxRenderable = (
	<SectionIcon>
		<rect x="3" y="4" width="18" height="16" rx="2" />
		<path d="M7 8h10M7 12h10M7 16h6" />
	</SectionIcon>
);

export const formsReactIcon: JsxRenderable = (
	<SectionIcon>
		<circle cx="12" cy="12" r="2" />
		<path d="M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20" />
	</SectionIcon>
);

export const formsRadiantIcon: JsxRenderable = (
	<SectionIcon>
		<path d="M12 3v18M3 12h18" />
		<circle cx="12" cy="12" r="7" />
	</SectionIcon>
);

export const stylingIcon: JsxRenderable = (
	<SectionIcon>
		<rect x="3" y="3" width="8" height="8" rx="1" />
		<rect x="13" y="3" width="8" height="5" rx="1" />
		<rect x="13" y="10" width="8" height="11" rx="1" />
		<rect x="3" y="13" width="8" height="8" rx="1" />
	</SectionIcon>
);

export const capabilitiesIcon: JsxRenderable = (
	<SectionIcon>
		<path d="M8 3h8l4 4v14H4V7l4-4z" />
		<path d="M8 3v4h8V3M12 11v6M9 14h6" />
	</SectionIcon>
);

export const actionsIcon: JsxRenderable = (
	<SectionIcon>
		<polygon points="5 4 19 12 5 20 5 4" />
	</SectionIcon>
);

export const registryIcon: JsxRenderable = (
	<SectionIcon>
		<rect x="3" y="3" width="7" height="7" rx="1" />
		<rect x="14" y="3" width="7" height="7" rx="1" />
		<rect x="3" y="14" width="7" height="7" rx="1" />
		<rect x="14" y="14" width="7" height="7" rx="1" />
	</SectionIcon>
);

export const examplesIcon: JsxRenderable = (
	<SectionIcon>
		<path d="M4 6h16M4 12h16M4 18h16" />
	</SectionIcon>
);
