import type { JsxRenderable } from '@ecopages/jsx';
import { jsx } from '@ecopages/jsx/jsx-runtime';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import {
	getSlotConfig,
	type CardShellConfig,
	type HeroShellConfig,
	type SidebarShellConfig,
	type SplitScreenShellConfig,
	type ViewModel,
} from '@schema-engine/forms/recipes';
import { viewContext } from '@/contexts/view-context';
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

export function SidebarShell({ slots, viewConfig }: FormShellProps): JsxRenderable {
	const { showSeparator = true } = getSlotConfig<SidebarShellConfig>(viewConfig, 'shell');
	return (
		<div class={showSeparator ? 'se-sidebar-shell' : 'se-sidebar-shell se-sidebar-shell--no-separator'}>
			{slots.progress ? <aside class="se-sidebar-shell__progress">{slots.progress}</aside> : null}
			<div class="se-sidebar-shell__separator" aria-hidden="true" />
			<div class="se-sidebar-shell__main">
				{slots.header ? <div class="se-sidebar-shell__header">{slots.header}</div> : null}
				<div class="se-sidebar-shell__content">{slots.content}</div>
				{slots.actions ? <div class="se-sidebar-shell__actions">{slots.actions}</div> : null}
			</div>
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
			{jsx('se-split-screen-side', {
				class: `split-screen-shell__side split-screen-shell__side--${sideWidth}${sidePlacement === 'right' ? ' split-screen-shell__side--right' : ''}`,
				'prop:sideContent': sideContent ?? '',
			})}
			<main class={`split-screen-shell__main split-screen-shell__main--${contentAlignment}`}>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions}
			</main>
		</div>
	);
}

@customElement('se-split-screen-side')
export class SplitScreenSideElement extends RadiantElement {
	@prop({ type: String }) sideContent = '';
	@contextSelector({ context: viewContext }) view!: ViewModel;

	override render(): JsxRenderable {
		if (!this.view) return null;
		const title = this.view.form.title || this.view.activeStep.title;
		const sideContent = this.sideContent;
		if (!title && !sideContent) return null;
		return (
			<>
				{title ? <h2 class="split-screen-shell__title">{title}</h2> : null}
				{sideContent ? <p class="split-screen-shell__side-content">{sideContent}</p> : null}
			</>
		);
	}
}
