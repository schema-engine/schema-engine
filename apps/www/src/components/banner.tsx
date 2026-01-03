import { cn } from '@/lib/utils';
import type { EcoComponent } from '@ecopages/core';
import type { JSX } from 'react';

export type BannerProps = {
	children: JSX.Element | JSX.Element[];
	type?: 'alert' | 'info';
	className?: string;
};

export type BannerTitleProps = {
	children: string;
	className?: string;
};

const BannerRoot: EcoComponent<BannerProps> = ({ children, type = 'info', className }) => {
	return (
		<div className={cn(`eco-banner eco-banner--${type}`, className)} role="alert">
			{children}
		</div>
	);
};

const BannerTitle: EcoComponent<BannerTitleProps> = ({ children, className }) => {
	return <p className={cn('eco-banner__title', className)}>{children}</p>;
};

export const Banner = Object.assign(BannerRoot, {
	Title: BannerTitle,
});

Banner.config = {
	dependencies: {
		stylesheets: ['./banner.css'],
	},
};
