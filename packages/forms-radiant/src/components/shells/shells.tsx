import type { JsxRenderable } from '@ecopages/jsx';
import '@ecopages/radiant-ui/heading/styles.css';
import { RuiHeading, RuiHeadingDescription } from '@ecopages/radiant-ui/heading';
import {
	getSlotConfig,
	type CardShellConfig,
	type HeroShellConfig,
	type SplitScreenShellConfig,
} from '@schema-engine/forms/recipes';
import type { FormShellProps } from '@/recipes/types';
import './card-shell.css';
import './hero-shell.css';
import './split-screen-shell.css';

export function StackShell({ slots }: FormShellProps): JsxRenderable {
	return (
		<div class="se-stack-shell">
			{slots.header ? <div class="se-stack-shell__header">{slots.header}</div> : null}
			{slots.progress ? <div class="se-stack-shell__progress">{slots.progress}</div> : null}
			<div class="se-stack-shell__content">{slots.content}</div>
			{slots.actions ? <div class="se-stack-shell__actions">{slots.actions}</div> : null}
		</div>
	);
}

export function SidebarShell({ slots }: FormShellProps): JsxRenderable {
	return (
		<div class="se-sidebar-shell">
			<aside class="se-sidebar-shell__progress">{slots.progress}</aside>
			<main class="se-sidebar-shell__main">
				{slots.header ? <div class="se-sidebar-shell__header">{slots.header}</div> : null}
				<div class="se-sidebar-shell__content">{slots.content}</div>
				{slots.actions ? <div class="se-sidebar-shell__actions">{slots.actions}</div> : null}
			</main>
		</div>
	);
}

export function CardShell({ slots, viewConfig }: FormShellProps): JsxRenderable {
	const { maxWidth = 'md', padding = 'md', shadowSize = 'md' } = getSlotConfig<CardShellConfig>(viewConfig, 'shell');
	return (
		<div class="card-shell">
			<div class={`card-shell__card card-shell__card--${maxWidth} card-shell__shadow--${shadowSize}`}>
				{slots.header ? (
					<div class={`card-shell__header card-shell__padding--${padding}`}>{slots.header}</div>
				) : null}
				<div class={`card-shell__content card-shell__padding--${padding}`}>
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}

export function HeroShell({ slots, viewConfig }: FormShellProps): JsxRenderable {
	const {
		backgroundImage,
		backgroundVideo,
		contentWidth = 'md',
	} = getSlotConfig<HeroShellConfig>(viewConfig, 'shell');
	return (
		<div class="hero-shell" style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}>
			{backgroundVideo ? (
				<video autoplay muted loop class="hero-shell__video">
					<source src={backgroundVideo} type="video/mp4" />
				</video>
			) : null}
			<div class="hero-shell__overlay" />
			<div class={`hero-shell__content hero-shell__content--${contentWidth}`}>
				{slots.header ? <div class="hero-shell__header">{slots.header}</div> : null}
				<div class="hero-shell__form">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}

export function SplitScreenShell({ slots, viewConfig }: FormShellProps): JsxRenderable {
	const {
		sideContent,
		sidePlacement = 'left',
		sideWidth = 'normal',
		contentAlignment = 'center',
	} = getSlotConfig<SplitScreenShellConfig>(viewConfig, 'shell');
	return (
		<div class="split-screen-shell">
			{sideContent ? (
				<aside
					class={`split-screen-shell__side split-screen-shell__side--${sideWidth}${sidePlacement === 'right' ? ' split-screen-shell__side--right' : ''}`}
				>
					<RuiHeading size="md" as="header">
						<RuiHeadingDescription>{sideContent}</RuiHeadingDescription>
					</RuiHeading>
				</aside>
			) : null}
			<main class={`split-screen-shell__main split-screen-shell__main--${contentAlignment}`}>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions}
			</main>
		</div>
	);
}
