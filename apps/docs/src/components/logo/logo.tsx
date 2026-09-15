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
				class="flex gap-1 items-center text-2xl font-semibold font-heading"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
					<title>Schema Engine logo</title>
					<rect width="32" height="32" rx="6" fill="currentColor" />
					<rect x="6" y="6" width="20" height="20" rx="2" class="logo__mark" />
					<rect x="10" y="12" width="12" height="2" class="logo__line" />
					<rect x="10" y="16" width="12" height="2" class="logo__line" />
					<rect x="10" y="20" width="8" height="2" class="logo__line" />
				</svg>

				{children}
			</a>
		);
	},
});
