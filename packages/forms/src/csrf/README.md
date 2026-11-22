# CSRF

`@schema-engine/forms/csrf` exports `csrf`, readers of a CSRF token that return the policy for
`createFormEngine({ csrf })`. It is off unless configured.

```ts
import { createFormEngine } from '@schema-engine/forms';
import { csrf } from '@schema-engine/forms/csrf';

const engine = createFormEngine({
	csrf: csrf.fromMeta('csrf-token', { header: 'X-CSRF-Token', field: '_csrf' }),
});

await engine.fetch('/api/signup', { method: 'POST', body }); // carries X-CSRF-Token
```

| Reader                                 | Reads                                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| `csrf.fromMeta(name, placement)`       | the `content` of `<meta name="...">`                        |
| `csrf.fromCookie(name, placement)`     | the decoded value of the cookie `name` in `document.cookie` |
| `csrf.custom({ token, ...placement })` | whatever `token()` returns                                  |

`placement` is `{ header, field? }`: the request header that carries the token, and the name of the hidden input a
native post carries it in. The policy is `{ token(): string | undefined; header: string; field?: string }`.

- **Read at request time, never stored.** A rotated token is picked up, and an empty one is none.
- **Where it goes.** `engine.fetch` adds the header only to a same-origin request (the URL is resolved against the
  document's base URL, `<base href>` included, and compared with `location`) with an unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`). A cross-origin request, a safe method, a
  missing token, and a page with no `location` (a server) send no header. A header the caller set under the same
  name is replaced.
- **SSR-safe.** Nothing touches `document` or `location` at import; on a server a reader's token is `undefined`.
- **Who uses it.** Every request the engine makes goes through `engine.fetch` (today the `async` validation rule),
  and actions get it as `context.fetch`, so they never remember a token. A binding reads `engine.getCsrf()` to add a
  hidden input, `{ name: policy.field, value: policy.token() }`, to a native post.
- **Never in the form.** The token is not in the config, the payload or the submitted values.
