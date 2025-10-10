import { cn } from '@/shadcn/lib/utils';
import type { BaseLayoutConfig } from './types';
import { useLayoutContext } from '@/contexts/layout-context';
import type React from 'react';

export interface HeroBackgroundLayoutConfig extends BaseLayoutConfig {
	layoutId: 'hero-background';
	backgroundImage?: string;
	backgroundVideo?: string;
	contentWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Hero Background Layout
 * Displays form content over a background image or video
 * Supports both single-step and multi-step forms
 * Loads configuration from global context
 */
export const HeroBackgroundLayout: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	const { config, step, form } = useLayoutContext<HeroBackgroundLayoutConfig>();
	const { backgroundImage, backgroundVideo, contentWidth = 'md' } = config;

	const contentWidthClass =
		{
			sm: 'hero-background-layout__content--sm',
			md: 'hero-background-layout__content--md',
			lg: 'hero-background-layout__content--lg',
			xl: 'hero-background-layout__content--xl',
		}[contentWidth] || 'hero-background-layout__content--md';

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

			<div className={`hero-background-layout__content ${contentWidthClass}`}>
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
				<div className="hero-background-layout__form">{children}</div>
			</div>
		</div>
	);
};

import type { ReactLayoutRegistration } from '@/registries/builder-registry';
import { HeroBackgroundLayoutConfigSchema } from './hero-background-layout.types';

export const HeroBackgroundLayoutRegistration: ReactLayoutRegistration = {
	layoutId: 'hero-background',
	component: HeroBackgroundLayout,
	schema: HeroBackgroundLayoutConfigSchema,
	metadata: {
		name: 'Hero Background Layout',
		description: 'Full-screen layout with background image or video',
		icon: 'image',
	},
};
