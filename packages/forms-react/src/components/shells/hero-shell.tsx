import { cva } from 'class-variance-authority';
import { getSlotConfig, type HeroShellConfig } from '@schema-engine/forms/recipes';
import type { FormShellProps } from '@/recipes/types';
import './hero-shell.css';

const contentVariants = cva('hero-shell__content', {
	variants: {
		width: {
			sm: 'hero-shell__content--sm',
			md: 'hero-shell__content--md',
			lg: 'hero-shell__content--lg',
			xl: 'hero-shell__content--xl',
		},
	},
	defaultVariants: {
		width: 'md',
	},
});

export function HeroShell({ slots, viewConfig }: FormShellProps) {
	const {
		backgroundImage,
		backgroundVideo,
		contentWidth = 'md',
	} = getSlotConfig<HeroShellConfig>(viewConfig, 'shell');

	return (
		<div
			className="hero-shell"
			style={{
				backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}}
		>
			{backgroundVideo ? (
				<video autoPlay muted loop className="hero-shell__video">
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			) : null}

			<div className="hero-shell__overlay" />

			<div className={contentVariants({ width: contentWidth })}>
				{slots.header ? <div className="hero-shell__header">{slots.header}</div> : null}
				<div className="hero-shell__form">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
