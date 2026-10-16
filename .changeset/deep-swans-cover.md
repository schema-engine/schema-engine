---
'@schema-engine/forms-react': major
'@schema-engine/forms': major
---

Move browser integrations out of the forms package root so core plugins can run without browser globals.

This is a breaking change because the forms root no longer exports browser tools and the core auto-save, reset, and GTM plugin factories no longer create browser-backed dependencies by default. Import browser tools and registrations from `@schema-engine/forms/browser`. When using the core plugin factories directly, pass storage to auto-save and reset, and pass a tracker to GTM. The browser registrations provide local storage, consent gating, and the shared draft key.
