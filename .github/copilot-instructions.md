# Copilot instructions

Brief for AI-assisted development on this project.

## Project

Browser extension (MV3, Chrome + Firefox) for searching PriceCharting.
Plain ES modules, no build step, no framework. Ship folder is `src/`.

## Code style

- Use `//` inline comments, not block `/* */` unless multi-line JSDoc.
- Comments explain **why**, not what. If the code is self-explanatory, skip the comment.
- Tone is casual and direct. Talk like a developer writing notes to themselves.
  - ✅ `// empty first`
  - ✅ `// skip unknown`
  - ✅ `//=> passing a function and not calling it`
  - ❌ `// This function iterates over the array and returns the result`
- `//TODO:` for actionable future work. Brief description of what and why.
- JSDoc `@param`, `@returns`, `@typedef` for public-facing functions
  and data structures. Keep it short.
- No redundant comments on obvious code (e.g. `const x = 5; // set x to 5`).

## File conventions

- `lib/` modules are pure: no DOM, no listeners, no side effects on import.
- Surface folders (`background/`, `options/`, `popup/`) wire things together.
- One responsibility per file. If a file does two things, split it.

## Commit messages

- Short subject line (imperative mood, ~50 chars).
- Body in the changelog, not in the commit message.

## Naming

- camelCase for JS variables, functions, settings keys.
- kebab-case for URL parameters and file names.
- UPPER_CASE for module-level constants (e.g. `DEFAULTS`, `CONSOLES`).

## What not to do

- Don't add tracking, telemetry, or remote code.
- Don't add permissions unless strictly necessary.
- Don't use `var`. Prefer `const`, use `let` when mutation is needed.
- Don't create documentation files unless asked.
- Don't commit generated files or `node_modules/`.

## Documentation

### Pre-push checklist (mandatory)

Before every push, verify that these files reflect the current state:
- `CHANGELOG.md` — new entry for any user-visible change.
- `README.md` — feature list, install instructions, project tree.
- `docs/architecture.md` — folder layout, file table.

Do this **per commit** when the commit introduces changes worth noting.
If a commit is purely internal (refactor, comment fix, dev tooling),
documentation updates are optional.

### Tone: user-first

- Changelog entries describe **what changed for the user**, not
  what syntax was touched.
  - ✅ "Custom URL templates now reject unsafe schemes."
  - ❌ "Added regex check in url-template.js line 73."
- Group small internal fixes under a single line like
  "Hardened input validation and error handling."
- Save technical detail for code comments and architecture docs.
