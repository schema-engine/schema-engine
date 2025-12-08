import { FormRenderer } from '@schema-engine/forms-react/components/internals/form-renderer';
import { FormEngineProvider } from '@schema-engine/forms-react/components/adapter-provider';
import { rhfAdapter } from '@schema-engine/forms-react/adapters/rhf';
import { formEngine } from '@/lib/form-engine-setup';
import { ViewportPreview } from '@schema-engine/forms-react/components/viewport-preview';
import { responsiveFormConfig } from '@/configs/forms/responsive-forms';

const handleSubmit = (data: any) => {
	console.log('Form submitted:', data);
};

/**
 * Responsive grid demo showcasing the grid layout system
 */
export function ResponsiveGridDemo() {
	return (
		<FormEngineProvider engine={formEngine} adapter={rhfAdapter}>
			<div className="container mx-auto px-4 py-8 max-w-7xl">
				<div className="space-y-8">
					<div className="text-center">
						<h1 className="text-3xl font-bold tracking-tight">Responsive Grid System Demo</h1>
						<p className="mt-2 text-lg text-muted-foreground">
							See how the form layout adapts to different screen sizes
						</p>
					</div>

					<ViewportPreview title="Interactive Responsive Preview">
						<FormRenderer config={responsiveFormConfig} onSubmit={handleSubmit} />
					</ViewportPreview>

					<div className="grid gap-6 md:grid-cols-2">
						<div className="space-y-4">
							<h2 className="text-xl font-semibold">Grid Configuration</h2>
							<div className="rounded-lg bg-muted p-4">
								<pre className="text-sm">{JSON.stringify(responsiveFormConfig.grid, null, 2)}</pre>
							</div>
						</div>

						<div className="space-y-4">
							<h2 className="text-xl font-semibold">Breakpoint System</h2>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="font-medium">default:</span>
									<span className="text-muted-foreground">0px+ (mobile)</span>
								</div>
								<div className="flex justify-between">
									<span className="font-medium">md:</span>
									<span className="text-muted-foreground">768px+ (tablet)</span>
								</div>
								<div className="flex justify-between">
									<span className="font-medium">lg:</span>
									<span className="text-muted-foreground">1024px+ (desktop)</span>
								</div>
								<div className="flex justify-between">
									<span className="font-medium">xl:</span>
									<span className="text-muted-foreground">1280px+ (large)</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</FormEngineProvider>
	);
}
