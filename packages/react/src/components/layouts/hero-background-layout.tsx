import { cn } from '@/shadcn/lib/utils';
import type { LayoutComponent } from './types';

interface HeroBackgroundLayoutConfig {
	backgroundImage?: string;
	backgroundVideo?: string;
	contentWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Hero Background Layout
 * Displays form content over a background image or video
 * Supports both single-step and multi-step forms
 */
export const HeroBackgroundLayout: LayoutComponent<HeroBackgroundLayoutConfig> = ({
	children,
	config,
	step,
	form,
	className,
}) => {
	const { backgroundImage, backgroundVideo, contentWidth = 'md' } = config || {};

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
				{(title || description || step) && (
					<div className="hero-background-layout__header">
						{title && <h1 className="hero-background-layout__title">{title}</h1>}
						{description && <p className="hero-background-layout__description">{description}</p>}
						{step && (
							<p className="hero-background-layout__step-counter">
								Step {step.index + 1} of {step.total}
							</p>
						)}
					</div>
				)}

				<div className="hero-background-layout__form">{children}</div>
			</div>
		</div>
	);
};
