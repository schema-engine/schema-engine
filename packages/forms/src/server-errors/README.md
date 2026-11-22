# Server errors

`@schema-engine/forms/server-errors` turns a server's error response into the input of the `setServerErrors` of a
passed `submit()` (see the [state container](../state-container/README.md#server-errors)). Both helpers are pure
functions: they read a response and return `path -> issue or issues`, each issue `{ type?, params?, message? }`.

```ts
import { fromProblemDetails } from '@schema-engine/forms/server-errors';

const result = await form.submit();
if (result.outcome === 'passed') {
	const response = await fetch('/api/signup', { method: 'POST', body: JSON.stringify(result.values) });
	if (!response.ok) result.setServerErrors(fromProblemDetails(await response.json()));
}
```

| Helper                        | Reads                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `fromProblemDetails(problem)` | RFC 9457 Problem Details with the common `errors[]` extension: `{ pointer?, detail?, code? }` |
| `fromJsonApiErrors(document)` | JSON:API `errors[]`: `source.pointer`, `code`, `detail`, `meta`                               |

- **Paths.** A pointer is a JSON Pointer (RFC 6901), plain or as a URI fragment (`#/contacts/0/email`), unescaped
  (`~1`, `~0`) and joined with dots. No pointer, or a pointer to the whole document, is `FORM_ROOT`. JSON:API drops
  a leading `/data/attributes`. A segment that holds a `.`, is empty, or is reserved (`__...`, `constructor`,
  `prototype`) is rejected.
- **Issues.** `type` is the error's `code`; for Problem Details it falls back to the problem's `type` (`about:blank`
  is none). `message` is `detail`. The other members of a Problem Details error, and the `meta` of a JSON:API error,
  become `params` when they are plain serializable values. `title` and `status` are not carried: the engine has no
  text of its own, and a host words an issue by its `type`.
- **No `errors`.** A Problem Details response without `errors` is one issue on `FORM_ROOT`.
- **Several errors on one path** become a list, in the order they came.
- **Unknown shapes throw** a `ServerErrorsInputError` rather than being guessed at: input that is not an object
  with a recognisable member, an `errors` that is not a list of objects, a pointer that is not one.
