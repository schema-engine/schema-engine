import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import './logo.css';

export type LogoProps = Partial<Pick<HTMLAnchorElement, 'href' | 'target' | 'title'>> & {
	children?: JsxRenderable;
};

export const Logo = eco.component<LogoProps, JsxRenderable>({
	render: ({ children = 'Schema Engine', href, target, title }) => {
		return (
			<a
				href={href}
				target={target}
				title={title}
				class="flex gap-2 items-center text-2xl font-semibold font-heading"
			>
				<svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none">
					<rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5" />
					<path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
				{children}
			</a>
		);
	},
});
