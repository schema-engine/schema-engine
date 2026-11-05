import { eco } from '@ecopages/core';
import { cn } from '@/styles/utils';
import type { JsxRenderable } from '@ecopages/jsx';
import './banner.css';

export type BannerProps = {
	children: JsxRenderable;
	type?: 'alert' | 'info';
	class?: string;
};

export type BannerTitleProps = {
	children: string;
	class?: string;
};

export function BannerTitle({ children, class: className }: BannerTitleProps) {
	return <p class={cn('eco-banner__title', className)}>{children}</p>;
}

export const Banner = eco.component<BannerProps, JsxRenderable>({
	render: ({ children, type = 'info', class: className }) => {
		return (
			<div class={cn(`eco-banner eco-banner--${type}`, className)} role={type === 'alert' ? 'alert' : undefined}>
				{children}
			</div>
		);
	},
});
