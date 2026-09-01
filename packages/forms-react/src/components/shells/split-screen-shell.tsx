import { cva } from 'class-variance-authority';
import { Heading, HeadingDescription, HeadingTitle } from '@/components/ui/heading';
import { getSlotConfig, type SplitScreenShellConfig } from '@schema-engine/forms/recipes';
import { useViewContext } from '@/contexts/view-context';
import type { FormShellProps } from '@/recipes/types';
import './split-screen-shell.css';

const sideVariants = cva('split-screen-shell__side', {
	variants: {
		width: {
			narrow: 'split-screen-shell__side--narrow',
			normal: 'split-screen-shell__side--normal',
			wide: 'split-screen-shell__side--wide',
		},
		placement: {
			left: '',
			right: 'split-screen-shell__side--right',
		},
	},
	defaultVariants: {
		width: 'normal',
		placement: 'left',
	},
});

const mainVariants = cva('split-screen-shell__main', {
	variants: {
		alignment: {
			top: 'split-screen-shell__main--top',
			center: 'split-screen-shell__main--center',
			bottom: 'split-screen-shell__main--bottom',
		},
	},
	defaultVariants: {
		alignment: 'center',
	},
});

export function SplitScreenShell({ slots, viewConfig }: FormShellProps) {
	const {
		sideContent,
		sidePlacement = 'left',
		sideWidth = 'normal',
		contentAlignment = 'center',
	} = getSlotConfig<SplitScreenShellConfig>(viewConfig, 'shell');
	const { form, activeStep } = useViewContext();
	const title = form.title || activeStep.title;

	return (
		<div className="split-screen-shell">
			{title || sideContent ? (
				<div className={sideVariants({ width: sideWidth, placement: sidePlacement })}>
					<Heading size="md" className="split-screen-shell__side-heading">
						{title ? <HeadingTitle>{title}</HeadingTitle> : null}
						{sideContent ? (
							<HeadingDescription className="split-screen-shell__side-content">
								{sideContent}
							</HeadingDescription>
						) : null}
					</Heading>
				</div>
			) : null}
			<div className={mainVariants({ alignment: contentAlignment })}>
				{slots.header}
				{slots.progress}
				{slots.content}
				{slots.actions}
			</div>
		</div>
	);
}
