import type { JSX_PROPS, JsxRenderable } from '@ecopages/jsx';
import { contextSelector } from '@ecopages/radiant/context';
import { customElement, prop, RadiantElement } from '@ecopages/radiant';
import type { FormMeta } from '@/lib/instance-view';
import { getAppearanceAttributes } from '@schema-engine/layout';
import { getSlotConfig } from '@schema-engine/forms/recipes';
import {
	CardShellConfigSchema,
	HeroShellConfigSchema,
	SidebarShellConfigSchema,
	SplitScreenShellConfigSchema,
} from '@schema-engine/forms/recipes/built-in';
import { formInstanceContext, type FormInstanceContextValue } from '@/contexts/form-instance-context';
import { deriveInitialInstance } from '@/lib/instance-view';
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
	const { appearance, showSeparator } = getSlotConfig(viewConfig, 'shell', SidebarShellConfigSchema);
	return (
		<div
			classes={['se-sidebar-shell', !showSeparator && 'se-sidebar-shell--no-separator']}
			{...getAppearanceAttributes(appearance)}
		>
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
	const { appearance } = getSlotConfig(viewConfig, 'shell', CardShellConfigSchema);
	return (
		<div class="card-shell">
			<div class="card-shell__card" {...getAppearanceAttributes(appearance)}>
				{slots.header ? <div class="card-shell__header card-shell__section">{slots.header}</div> : null}
				<div class="card-shell__content card-shell__section">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}

export function HeroShell({ slots, viewConfig }: FormShellProps): JsxRenderable {
	const { appearance, backgroundImage, backgroundVideo, contentWidth } = getSlotConfig(
		viewConfig,
		'shell',
		HeroShellConfigSchema,
	);
	return (
		<div
			class="hero-shell"
			style={{ backgroundImage: backgroundImage ? `url(${JSON.stringify(backgroundImage)})` : undefined }}
			{...getAppearanceAttributes(appearance)}
		>
			{backgroundVideo ? (
				<video autoplay muted loop playsinline src={backgroundVideo} class="hero-shell__video" />
			) : null}
			<div class="hero-shell__overlay" />
			<div classes={['hero-shell__content', `hero-shell__content--${contentWidth}`]}>
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

/**
 * @remarks
 * The panel shows the form title. When the recipe has a header slot, that header must set
 * `fallbackToFormTitle: false` in its slot defaults, or the form title is repeated in the header
 * for steps without a title. A custom recipe that reuses this shell with a header slot must set
 * that default too.
 */
export function SplitScreenShell({ slots, viewConfig, meta }: FormShellProps): JsxRenderable {
	const { appearance, sideContent, sidePlacement, sideWidth, contentAlignment } = getSlotConfig(
		viewConfig,
		'shell',
		SplitScreenShellConfigSchema,
	);
	return (
		<div class="split-screen-shell" {...getAppearanceAttributes(appearance)}>
			<SplitScreenSideElement
				class={`split-screen-shell__side split-screen-shell__side--${sideWidth}${sidePlacement === 'right' ? ' split-screen-shell__side--right' : ''}`}
				sideContent={sideContent ?? ''}
				hasHeader={Boolean(slots.header)}
				meta={meta}
			/>
			<main classes={['split-screen-shell__main', `split-screen-shell__main--${contentAlignment}`]}>
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
	declare readonly [JSX_PROPS]?: Partial<Pick<SplitScreenSideElement, 'sideContent' | 'hasHeader' | 'meta'>>;

	@prop({ type: String }) sideContent = '';
	@prop({ type: Boolean }) hasHeader = false;
	@prop({ type: Object }) meta?: FormMeta;

	@contextSelector({ context: formInstanceContext })
	protected instance?: FormInstanceContextValue;

	override render(): JsxRenderable {
		const meta = this.meta;
		if (!meta) return this.slotted;
		const instance = this.instance ?? deriveInitialInstance(meta);
		const step = meta.steps.find(({ id }) => id === instance.current) ?? meta.steps[0];
		const title = meta.title || (this.hasHeader ? undefined : step?.title);
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
