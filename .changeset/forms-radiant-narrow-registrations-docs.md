---
'@schema-engine/forms-radiant': patch
---

Document registering only the elements a form uses

`createRadiantFormEngine` has always accepted any array of element
registrations — `schemaFormRegistrations` is a convenience default, not the
only option. Each built-in registration is also its own named export from the
`/registrations` subpath, so an app that knows its `$type` set can pass just
that subset instead of the full catalog. No code change; this documents an
existing capability in the package README, with the failure mode (an
unregistered `$type` renders an inline error naming it, in both dev and
production) stated alongside it.
