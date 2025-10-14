import { cn } from '@/shadcn/lib/utils';
import { cva } from 'class-variance-authority';
import type { HeroBackgroundLayoutConfig, HeroBackgroundLayoutProps } from './hero-background-layout.types';
import { useLayoutContext } from '@/contexts/layout-context';
import type React from 'react';

const contentVariants = cva('hero-background-layout__content', {
	variants: {
		width: {
			sm: 'hero-background-layout__content--sm',
			md: 'hero-background-layout__content--md',
			lg: 'hero-background-layout__content--lg',
			xl: 'hero-background-layout__content--xl',
		},
	},
	defaultVariants: {
		width: 'md',
	},
});

/**
 * Hero Background Layout
 * Displays form content over a background image or video
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const HeroBackgroundLayout: React.FC<HeroBackgroundLayoutProps> = ({ children, className }) => {
	const { step, form, config } = useLayoutContext<HeroBackgroundLayoutConfig>();
	const { backgroundImage, backgroundVideo, contentWidth = 'md' } = config;

	const title = step?.title || form.title;
	const description = step?.description || form.description;

	return (
		<div
			className={cn('hero-background-layout', className)}
			style={{
				backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}}
		>
			{backgroundVideo && (
				<video autoPlay muted loop className="hero-background-layout__video">
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			)}

			<div className="hero-background-layout__overlay" />

			<div className={contentVariants({ width: contentWidth })}>
				{title || description || (typeof step.index === 'number' && typeof step.total === 'number') ? (
					<div className="hero-background-layout__header">
						{title ? <h1 className="hero-background-layout__title">{title}</h1> : null}
						{description ? <p className="hero-background-layout__description">{description}</p> : null}
						{typeof step.index === 'number' && typeof step.total === 'number' ? (
							<p className="hero-background-layout__step-counter">
								Step {step.index + 1} of {step.total}
							</p>
						) : null}
					</div>
				) : null}{' '}
				<div className="hero-background-layout__form">{children as React.ReactNode}</div>
			</div>
		</div>
	);
};

import type { LayoutRegistration } from '@json-form-engine/core/types';
import { HeroBackgroundLayoutConfigSchema } from './hero-background-layout.types';

export const HeroBackgroundLayoutRegistration: LayoutRegistration<
	HeroBackgroundLayoutConfig,
	HeroBackgroundLayoutProps
> = {
	__id: 'hero-background',
	render: HeroBackgroundLayout,
	schema: HeroBackgroundLayoutConfigSchema,
	metadata: {
		name: 'Hero Background Layout',
		description: 'Full-screen layout with background image or video',
		icon: 'image',
	},
};
