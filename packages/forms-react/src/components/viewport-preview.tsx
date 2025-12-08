import type React from 'react';
import { useState } from 'react';
import { type Breakpoint, BreakpointOverrideProvider } from '../hooks/grid-hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/shadcn/ui/card';
import { Button } from '@/shadcn/ui/button';
import { Badge } from '@/shadcn/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Viewport preview props
 */
interface ViewportPreviewProps {
	children: React.ReactNode;
	showControls?: boolean;
	defaultBreakpoint?: Breakpoint;
	className?: string;
	title?: string;
}

/**
 * Breakpoint control component
 */
interface BreakpointControlsProps {
	currentBreakpoint: Breakpoint;
	onBreakpointChange: (breakpoint: Breakpoint) => void;
}

function BreakpointControls({ currentBreakpoint, onBreakpointChange }: BreakpointControlsProps) {
	const breakpointInfo = {
		default: { label: 'Mobile', width: '375px', desc: 'iPhone SE' },
		sm: { label: 'Small', width: '640px', desc: 'Small tablet' },
		md: { label: 'Tablet', width: '768px', desc: 'iPad portrait' },
		lg: { label: 'Desktop', width: '1024px', desc: 'iPad landscape' },
		xl: { label: 'Large', width: '1280px', desc: 'Desktop' },
		'2xl': { label: 'XL', width: '1536px', desc: 'Large desktop' },
	};

	return (
		<div className="flex flex-wrap gap-2">
			{Object.entries(breakpointInfo).map(([breakpoint, info]) => (
				<Button
					key={breakpoint}
					variant={currentBreakpoint === breakpoint ? 'default' : 'outline'}
					size="sm"
					onClick={() => onBreakpointChange(breakpoint as Breakpoint)}
					className="relative flex flex-col h-auto py-2"
				>
					<div className="font-medium">{info.label}</div>
					<Badge variant="secondary" className="text-xs mt-1">
						{info.width}
					</Badge>
				</Button>
			))}
		</div>
	);
}

const getContainerWidth = (breakpoint: Breakpoint): string => {
	switch (breakpoint) {
		case 'default':
			return '375px';
		case 'sm':
			return '640px';
		case 'md':
			return '768px';
		case 'lg':
			return '1024px';
		case 'xl':
			return '1280px';
		case '2xl':
			return '1536px';
		default:
			return '375px';
	}
};

/**
 * Viewport preview wrapper component
 * Provides a responsive preview by simulating different viewport sizes
 */
export function ViewportPreview({
	children,
	showControls = true,
	defaultBreakpoint = 'default',
	className,
	title = 'Responsive Preview',
}: ViewportPreviewProps) {
	const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>(defaultBreakpoint);

	const containerStyle: React.CSSProperties = {
		width: getContainerWidth(currentBreakpoint),
		minWidth: getContainerWidth(currentBreakpoint), // Ensure minimum width equals breakpoint
		height: '600px', // Fixed height like a real device
		// Remove maxWidth to allow scrolling for larger breakpoints
		margin: '0 auto',
		transition: 'width 0.3s ease-in-out',
		border: '2px solid hsl(var(--border))',
		borderRadius: '12px', // Device-like rounded corners
		overflow: 'hidden',
		backgroundColor: '#ffffff', // Pure white for device
		boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
		flexShrink: 0, // Prevent shrinking in flex container
	};

	return (
		<Card className={cn('w-full', className)}>
			{showControls && (
				<CardHeader className="pb-4">
					<div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
						<div>
							<CardTitle className="text-lg">{title}</CardTitle>
							<p className="text-sm text-muted-foreground">
								Preview how your form looks at different screen sizes
							</p>
						</div>
						<div className="flex flex-col space-y-2 sm:items-end">
							<div className="text-sm font-medium text-muted-foreground">
								Current breakpoint: <span className="text-foreground">{currentBreakpoint}</span>
							</div>
							<BreakpointControls
								currentBreakpoint={currentBreakpoint}
								onBreakpointChange={setCurrentBreakpoint}
							/>
						</div>
					</div>
				</CardHeader>
			)}
			<CardContent className="p-0">
				<div className="bg-gray-100 p-4 sm:p-6 lg:p-8 overflow-x-auto">
					<div className="flex justify-center min-w-full">
						<div style={containerStyle}>
							{/* Device header simulation */}
							<div className="h-8 bg-gray-50 border-b border-gray-200 flex items-center justify-center px-4">
								<div className="flex items-center space-x-2">
									<div className="w-2 h-2 bg-gray-300 rounded-full" />
									<div className="w-2 h-2 bg-gray-300 rounded-full" />
									<div className="w-2 h-2 bg-gray-300 rounded-full" />
								</div>
								<div className="ml-auto text-xs text-gray-500 font-mono">
									{getContainerWidth(currentBreakpoint)}
								</div>
							</div>

							{/* Scrollable content area */}
							<div className="overflow-y-auto" style={{ height: 'calc(100% - 32px)' }}>
								<BreakpointOverrideProvider value={currentBreakpoint}>
									<div className="p-4 min-h-full">{children}</div>
								</BreakpointOverrideProvider>
							</div>
						</div>
					</div>
				</div>
				{showControls && (
					<div className="border-t bg-muted/20 px-4 py-3">
						<div className="flex flex-col space-y-2 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:space-y-0">
							<div>
								Device width: <span className="font-mono">{getContainerWidth(currentBreakpoint)}</span>
								<span className="ml-2 text-xs">
									(
									{
										Object.entries({
											default: 'iPhone SE',
											sm: 'Small tablet',
											md: 'iPad portrait',
											lg: 'iPad landscape',
											xl: 'Desktop',
											'2xl': 'Large desktop',
										}).find(([key]) => key === currentBreakpoint)?.[1]
									}
									)
								</span>
							</div>
							<div>
								Simulating: <span className="font-medium text-foreground">{currentBreakpoint}</span>{' '}
								breakpoint
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Breakpoint indicator component for development
 */
export function BreakpointIndicator({ className }: { className?: string }) {
	return (
		<div className={cn('fixed bottom-4 right-4 z-50', className)}>
			<Badge variant="outline" className="bg-background font-mono text-xs">
				<span className="block sm:hidden">default</span>
				<span className="hidden sm:block md:hidden">sm</span>
				<span className="hidden md:block lg:hidden">md</span>
				<span className="hidden lg:block xl:hidden">lg</span>
				<span className="hidden xl:block 2xl:hidden">xl</span>
				<span className="hidden 2xl:block">2xl</span>
			</Badge>
		</div>
	);
}
