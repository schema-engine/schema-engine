import type React from 'react';
import { cn } from '@/shadcn/lib/utils';
import type { BaseLayoutProps } from './types';

interface HeroBackgroundLayoutConfig {
	backgroundImage?: string;
	backgroundVideo?: string;
	contentWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Hero Background Layout
 * Displays form content over a background image or video
 */
export const HeroBackgroundLayout: React.FC<BaseLayoutProps> = ({ children, config, step, className }) => {
	const heroConfig = config as HeroBackgroundLayoutConfig | undefined;
	const { backgroundImage, backgroundVideo, contentWidth = 'md' } = heroConfig || {};

	const contentWidthClass =
		{
			sm: 'hero-background-layout__content--sm',
			md: 'hero-background-layout__content--md',
			lg: 'hero-background-layout__content--lg',
			xl: 'hero-background-layout__content--xl',
		}[contentWidth] || 'hero-background-layout__content--md';

	return (
		<div
			className={cn('hero-background-layout', className)}
			style={{
				...(backgroundImage && {
					backgroundImage: `url(${backgroundImage})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
				}),
			}}
		>
			{backgroundVideo && (
				<video autoPlay muted loop className="hero-background-layout__video">
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			)}

			<div className="hero-background-layout__overlay" />

			<div className={`hero-background-layout__content ${contentWidthClass}`}>
				<div className="hero-background-layout__header">
					<h1 className="hero-background-layout__title">{step.title}</h1>
					{step.description && <p className="hero-background-layout__description">{step.description}</p>}
					<p className="hero-background-layout__step-counter">
						Step {step.index + 1} of {step.total}
					</p>
				</div>

				<div className="hero-background-layout__form">{children}</div>
			</div>
		</div>
	);
};
