---
'@schema-engine/actions': patch
---

`parseActions` takes `options.hint(type)`, the sentence that ends the message of an action `$type` nothing registers. Without it the message ends as before with `Register it in the action registry.`, so an unregistered `put` is `No registration for $type 'put'. Register it in the action registry.` (it was `Unknown action type 'put'. Register it in the action registry.`). A domain that registers actions through its own entry point passes its own sentence.
