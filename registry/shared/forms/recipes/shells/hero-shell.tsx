import { getSlotConfig } from '@schema-engine/forms/recipes';
import { HeroShellConfigSchema } from '@schema-engine/forms/recipes/built-in';
import type { FormShellProps } from '@schema-engine/forms-react/primitives';
import { cn } from '@/components/schema-engine/forms/lib/utils';

const contentWidths = {
	sm: 'max-w-sm',
	md: 'max-w-md',
	lg: 'max-w-lg',
	xl: 'max-w-xl',
} as const;

export function HeroShell({ slots, viewConfig }: FormShellProps) {
	const { backgroundImage, backgroundVideo, contentWidth } = getSlotConfig(
		viewConfig,
		'shell',
		HeroShellConfigSchema,
	);

	return (
		<div
			className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-muted px-4 py-8 text-primary-foreground md:px-8"
			style={{
				backgroundImage: backgroundImage ? `url(${JSON.stringify(backgroundImage)})` : undefined,
				backgroundPosition: 'center',
				backgroundSize: 'cover',
			}}
		>
			{backgroundVideo ? (
				<video
					autoPlay
					muted
					loop
					playsInline
					src={backgroundVideo}
					className="absolute inset-0 z-0 size-full object-cover"
				/>
			) : null}
			<div className="absolute inset-0 z-1 bg-black/50" />
			<div className={cn('relative z-2 w-full text-center', contentWidths[contentWidth])}>
				{slots.header ? <div className="mb-8">{slots.header}</div> : null}
				<div className="flex flex-col gap-6 rounded-lg bg-card/95 p-8 text-left text-card-foreground shadow-lg">
					{slots.progress}
					{slots.content}
					{slots.actions}
				</div>
			</div>
		</div>
	);
}
