# Browser entry point

Import from `@schema-engine/forms/browser` for integrations that use browser
storage or analytics globals. The package root remains safe for server-side
and runtime-neutral engine use.

This entry point exports the consent and GTM tools, a localStorage adapter, and
preconfigured auto-save, reset, and GTM action registrations. Auto-save requires
consent before writing. Auto-save and reset use the shared
`autosave_<formId>` storage key, and revoking consent removes those drafts.
The localStorage adapter also tracks custom `storageKey` values written by an
auto-save action, so consent revocation removes those drafts as well.
`GDPRConsent` drafts go through the same tracked adapter. Revocation removes
only keys that adapter recorded; drafts written to storage directly, or by a
custom `AutoSaveStorage`, are left in place.

The action-registration factory accepts storage, consent, and confirmation
ports so hosts can use isolated adapters in tests or supply their own browser
policy.
