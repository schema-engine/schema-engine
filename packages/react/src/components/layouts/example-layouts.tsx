import type React from 'react';
import type { SharedLayoutComponentProps } from './shared-types';

interface SplitScreenLayoutConfig {
	sideContent?: string;
	sidePlacement?: 'left' | 'right';
	sideWidth?: 'narrow' | 'normal' | 'wide';
	backgroundColor?: string;
}

interface HeroBackgroundLayoutConfig {
	backgroundImage?: string;
	backgroundColor?: string;
	backgroundVideo?: string;
	contentWidth?: 'sm' | 'md' | 'lg' | 'xl';
	textColor?: string;
}

interface CardLayoutConfig {
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
	padding?: 'sm' | 'md' | 'lg';
	backgroundColor?: string;
	shadowSize?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Split Screen Layout
 * Displays the form content alongside additional information or media
 */
export const SplitScreenLayout: React.FC<SharedLayoutComponentProps> = ({ children, config, step }) => {
	const splitConfig = config as SplitScreenLayoutConfig | undefined;
	const {
		sideContent = 'Welcome!',
		sidePlacement = 'left',
		sideWidth = 'normal',
		backgroundColor = '#f8f9fa',
	} = splitConfig || {};

	const isLeftSide = sidePlacement === 'left';

	const widthClass =
		{
			narrow: 'w-1/3',
			normal: 'w-1/2',
			wide: 'w-2/3',
		}[sideWidth] || 'w-1/2';

	return (
		<div className="flex min-h-screen">
			{isLeftSide && (
				<div className={`${widthClass} flex flex-col justify-center p-8`} style={{ backgroundColor }}>
					<h2 className="text-2xl font-semibold mb-4">
						Step {step.index + 1} of {step.total}
					</h2>
					{step.title && <h3 className="text-xl font-medium mb-2">{step.title}</h3>}
					{step.description && <p className="text-gray-600 mb-4">{step.description}</p>}
					<div className="text-gray-700">{sideContent}</div>
				</div>
			)}

			<div className="flex-1 p-8 overflow-auto">{children}</div>

			{!isLeftSide && (
				<div className={`${widthClass} flex flex-col justify-center p-8`} style={{ backgroundColor }}>
					<h2 className="text-2xl font-semibold mb-4">
						Step {step.index + 1} of {step.total}
					</h2>
					{step.title && <h3 className="text-xl font-medium mb-2">{step.title}</h3>}
					{step.description && <p className="text-gray-600 mb-4">{step.description}</p>}
					<div className="text-gray-700">{sideContent}</div>
				</div>
			)}
		</div>
	);
};

/**
 * Hero Background Layout
 * Displays form content over a background image or video
 */
export const HeroBackgroundLayout: React.FC<SharedLayoutComponentProps> = ({ children, config, step }) => {
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
			sm: 'max-w-sm',
			md: 'max-w-md',
			lg: 'max-w-lg',
			xl: 'max-w-xl',
		}[contentWidth] || 'max-w-md';

	return (
		<div
			className="min-h-screen flex items-center justify-center relative"
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
				<video autoPlay muted loop className="absolute inset-0 w-full h-full object-cover -z-10">
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			)}

			<div className="absolute inset-0 z-0" style={{ backgroundColor }} />

			<div className={`relative z-10 w-full ${contentWidthClass} px-8 text-center`}>
				<div className="mb-8">
					<h1 className="text-4xl font-bold mb-4">{step.title}</h1>
					{step.description && <p className="text-lg mb-2">{step.description}</p>}
					<p className="text-sm opacity-80">
						Step {step.index + 1} of {step.total}
					</p>
				</div>

				<div className="bg-white bg-opacity-95 text-gray-800 p-8 rounded-lg shadow-lg">{children}</div>
			</div>
		</div>
	);
};

/**
 * Card Layout
 * Displays form content in a centered card
 */
export const CardLayout: React.FC<SharedLayoutComponentProps> = ({ children, config, step }) => {
	const cardConfig = config as CardLayoutConfig | undefined;
	const { maxWidth = 'md', padding = 'md', backgroundColor = 'white', shadowSize = 'md' } = cardConfig || {};

	const maxWidthClass =
		{
			sm: 'max-w-sm',
			md: 'max-w-md',
			lg: 'max-w-lg',
			xl: 'max-w-xl',
		}[maxWidth] || 'max-w-md';

	const paddingClass =
		{
			sm: 'p-4',
			md: 'p-6',
			lg: 'p-8',
		}[padding] || 'p-6';

	const shadowClass =
		{
			sm: 'shadow-sm',
			md: 'shadow-md',
			lg: 'shadow-lg',
			xl: 'shadow-xl',
		}[shadowSize] || 'shadow-md';

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
			<div
				className={`w-full ${maxWidthClass} ${shadowClass} rounded-xl overflow-hidden`}
				style={{ backgroundColor }}
			>
				<div className={`${paddingClass} text-center border-b border-gray-200`}>
					<h2 className="text-2xl font-semibold mb-2">{step.title}</h2>
					{step.description && <p className="text-gray-600 mb-2">{step.description}</p>}
					<small className="text-gray-500 text-sm">
						Step {step.index + 1} of {step.total}
					</small>
				</div>

				<div className={paddingClass}>{children}</div>
			</div>
		</div>
	);
};
