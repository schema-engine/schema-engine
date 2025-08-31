import type React from 'react';
import FormEngineActionExecutor from '@/components/demo/form-engine-action-executor';

const SequentialActionsPage: React.FC = () => {
	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-4">Sequential Action Execution</h1>
				<p className="text-gray-600 dark:text-gray-300 max-w-2xl">
					Demonstration of the pure plugin-based action system with FormEngine integration. This shows how
					actions are executed sequentially with proper submit lifecycle triggers and maximum configurability.
				</p>
			</div>
			<div className="mb-6">
				<h2 className="text-xl font-semibold mb-2">FormEngine + Action System</h2>
				<p className="text-gray-600 dark:text-gray-300 text-sm">
					Complete FormEngine integration with declarative form configuration and action system.
				</p>
			</div>
			<FormEngineActionExecutor />
			<div className="mt-8 prose prose-sm dark:prose-invert max-w-none">
				<h2>Pure Plugin Architecture</h2>
				<ul>
					<li>
						<strong>Plugin-Only System:</strong> No hardcoded core actions - everything is a plugin
					</li>
					<li>
						<strong>Factory Pattern:</strong> Configurable plugin creation with sensible defaults
					</li>
					<li>
						<strong>Sequential Execution:</strong> Actions run one after another, preventing race conditions
					</li>
					<li>
						<strong>Submit Lifecycle:</strong> Complete submit_start → submit_success/error →
						submit_complete flow
					</li>
					<li>
						<strong>Maximum Configurability:</strong> Every aspect of behavior can be customized
					</li>
				</ul>

				<h2>Action Flow</h2>
				<ol>
					<li>
						User clicks submit → triggers <code>form_submit</code>
					</li>
					<li>Submit plugin executes with form validation and configurable request handling</li>
					<li>
						On success → triggers <code>submit_success</code> (notifications, reset, etc.)
					</li>
					<li>
						On error → triggers <code>submit_error</code> (error notifications)
					</li>
					<li>
						Finally → triggers <code>submit_complete</code> (cleanup actions)
					</li>
				</ol>

				<h2>Plugin Registration Example</h2>
				<pre>
					<code>{`import { registerAction } from "@/lib/form-engine/actions/action-registry";
import { submitPlugin, resetPlugin, notificationPlugin } from "@/lib/form-engine/actions/plugins";

// Configure and register submit plugin
registerAction(submitPlugin({
  onSuccess: (data, context) => console.log("Submitted:", data),
  onError: (error, context) => console.error("Submit failed:", error)
}));

// Configure and register reset plugin  
registerAction(resetPlugin({
  confirm: (message) => window.confirm(message),
  onReset: (context) => console.log("Form reset!")
}));

// Configure and register notification plugin
registerAction(notificationPlugin({
  onSuccess: (message) => toast.success(message),
  onError: (message) => toast.error(message)
}));`}</code>
				</pre>

				<h2>Form Configuration Example</h2>
				<pre>
					<code>{`const actions: FormActionConfig[] = [
  {
    id: "submit-form",
    type: "submit", // Now handled by registered submit plugin
    endpoint: "/api/submit",
    method: "POST"
  },
  {
    id: "reset-after-success", 
    type: "reset", // Handled by registered reset plugin
    triggers: ["submit_success"], // Runs AFTER successful submit
  },
  {
    id: "success-notification",
    type: "show_notification", // Handled by registered notification plugin
    triggers: ["submit_success"],
    message: "Form submitted successfully!",
    variant: "success"
  }
];`}</code>
				</pre>

				<h2>Key Benefits</h2>
				<ul>
					<li>
						<strong>Maximum Flexibility:</strong> Every aspect of behavior can be customized
					</li>
					<li>
						<strong>No Lock-in:</strong> Replace any plugin with your own implementation
					</li>
					<li>
						<strong>Type Safety:</strong> Full TypeScript support for all plugins
					</li>
					<li>
						<strong>Clean Architecture:</strong> No hardcoded logic in core - truly plugin-driven
					</li>
				</ul>
			</div>
		</div>
	);
};

export default SequentialActionsPage;
