# Agent tool

Experimental. `registerFormAgentTool` offers a rendered form to a browser agent as a [WebMCP](https://developer.chrome.com/docs/ai/webmcp) tool. WebMCP is an Origin Trial and its API may change. Import it from `@schema-engine/forms/agent-tool`: no other entry imports it, so a form that does not use it carries none of it.

```ts
import { registerFormAgentTool } from '@schema-engine/forms/agent-tool';

const unregister = registerFormAgentTool(runtime, {
	name: 'send_feedback',
	description: 'Fill in the feedback form',
	engine,
	config, // the normalized config the runtime was created from
	autoSubmit: false, // the default: fill, and wait for the user
});
```

The imperative API is used (`document.modelContext.registerTool(tool, { signal })`), not the declarative `toolname` on a `<form>`: the engine has the schema, and it runs the submission itself. The function does nothing on the server and where `document.modelContext` is missing, and the returned function removes the tool by aborting the signal it registered with.

- **Schema.** `inputSchema` is the JSON Schema of `engine.submissionSchema(config)`, each parameter described by its field's label and help text. A value schema with no JSON Schema throws at registration.
- **Input.** `execute(input, { signal })` checks the input against the same schema without requiring any key, so a value of the wrong type is refused before it touches the form. It writes the values into the runtime's container, as a person's edits arrive.
- **Submission.** With `autoSubmit` it then calls `runtime.submit()`: the same validation, constraints, value check, actions and `onSubmit` as a human submit. In a wizard it submits again after each step it moves past, so the answers fill the steps they make active and a skipped step's values are not submitted. A refused submission returns its issues as text, worded by the form's `formatIssue` (the option, else the engine's).
- **`autoSubmit`** is for forms that only read or change something low risk and reversible. Left `false`, the tool fills the form and says it waits for the user.
- **Abort.** A call aborted before it writes changes nothing. One aborted while it submits puts back the values and the step the user had, unless the form was already submitted.

The binding hands the runtime over: `useFormRuntime()` in `@schema-engine/forms-react/hooks`, `FormController.watchRuntime` in `@schema-engine/forms-radiant`.
