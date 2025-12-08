# Copilot Coding Rules

## Commenting

- Avoid inline comments (`// ...`).
- Use JSDoc comments (`/** ... */`) only when necessary, especially for public APIs, complex logic, or exported functions/classes.
- Do not over-comment; prefer clear, self-explanatory code.

## Formatting

- Do not worry about style or formatting issues (e.g., Prettier, linter warnings).
- Auto-format on save will handle these.
- Template literals are preferred over string concatenation.
- Do not use emoji, symbols, or other non-standard characters. Instead you can use plain text (i.e. `[what-emoji-represent]`)

## Imports

- Use absolute imports with `@/` for project files.
- Avoid barrel files; import directly from the source file.
- Group imports: external libraries first, then internal modules, then styles.
- Do not use wildcard imports (e.g., `import * as ...`) unless absolutely necessary.
- Do not include unused imports; remove them.

## TypeScript

- Avoid TypeScript hacks and anti-patterns.
- Do not use `any` unless absolutely necessary.
    - If you must use `any`, add a comment explaining why.
- Prefer `unknown` over `any` when possible.

## React

- Always prefer ternary operators over `&&` for conditional rendering to avoid rendering unintended falsy values.

## JS Runtime

- Please remember we are using bun js

## Preview and commands

- Please do not run `bun run dev` to see if the code works. You can't even check the logs.

## Commit messages

- Do not use the present tense (i.e. "add new feature" is wrong, "added new feature" is correct)
- Limit the characters to 280
- Use the following format: `type(scope): short description`
    - `type` can be one of the following:
        - feat: a new feature
        - fix: a bug fix
        - docs: documentation only changes
        - style: changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        - refactor: a code change that neither fixes a bug nor adds a feature
        - perf: a code change that improves performance
        - test: adding missing tests or correcting existing tests
        - chore: changes to the build process or auxiliary tools and libraries such as documentation generation
    - `scope` is the name of the branch
    - `short description` is a short description of the change
- Example: `feat(validation): added new validation rule for email addresses`
- Do not use bullet points, lists, or other formatting in the commit message or new lines

## Readmes

- When creating a new feature or a new module, please remember to add a README file explaining how to use it.This should be doen sparely, not in every file and at the end of the development. I dont' want to see a README file in every folder for every small change or fixes. Just for big features or modules.
- The README file should be in the root of the module or feature folder.
- It should not explain how we get there, but how to use it.
- Use markdown formatting.
