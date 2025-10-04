import type React from 'react';
import type { BaseLayoutProps } from './fundamentals';

interface HeroBackgroundLayoutConfig {
	backgroundImage?: string;
	backgroundColor?: string;
	backgroundVideo?: string;
	contentWidth?: 'sm' | 'md' | 'lg' | 'xl';
	textColor?: string;
}

/**
 * Hero Background Layout
 * Displays form content over a background image or video
 */
export const HeroBackgroundLayout: React.FC<BaseLayoutProps> = ({ children, config, step }) => {
	const heroConfig = config as HeroBackgroundLayoutConfig | undefined;
	const {
		backgroundImage,
		backgroundColor = 'rgba(0, 0, 0, 0.5)',
		backgroundVideo,
		contentWidth = 'md',
		textColor = 'white',
	} = heroConfig || {};

	const contentWidthClass =
		{
			sm: 'hero-background-layout__content--sm',
			md: 'hero-background-layout__content--md',
			lg: 'hero-background-layout__content--lg',
			xl: 'hero-background-layout__content--xl',
		}[contentWidth] || 'hero-background-layout__content--md';

	return (
		<div
			className="hero-background-layout"
			style={{
				color: textColor,
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

			<div className="hero-background-layout__overlay" style={{ backgroundColor }} />

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
