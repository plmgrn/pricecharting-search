# Local — private working folder

> ⚠️ **This folder is git-ignored.** Anything you put here stays on your
> machine and never reaches GitHub. Only this `README.md` is committed,
> so the folder's purpose is visible to future maintainers.

## What belongs here

- **Personal notes & scratch files** — todo lists, half-baked thoughts,
  draft commit messages, links you want to revisit.
- **Experiments** — throwaway scripts, snippets you're testing, output
  dumps from `web-ext run`.
- **Credentials & tokens** *(if absolutely necessary)* — e.g. a local
  `.env`, a copy of an API key while you're testing. Prefer a real
  secret manager, but if it has to live on disk, it lives here.
- **Local-only tooling configs** — editor session files, profile-specific
  paths, anything that would be wrong on someone else's machine.
- **Drafts of public docs** — work-in-progress versions of `README.md`,
  `CHANGELOG.md` entries, etc. Move them to the right place when ready.

## What does *not* belong here

- Anything you want to share, version, or get reviewed.
- The only source of truth for anything important — this folder is not
  backed up. Treat it as ephemeral.
- Files larger than a few MB — git won't catch them, but they'll still
  bloat your working copy.

## How the ignore works

The repo root `.gitignore` contains:

```
local/
!local/README.md
```

That means:
- `local/` and everything inside it is ignored.
- The `!` re-includes this README so the folder's purpose stays
  documented in the committed tree.

To double-check at any time:

```powershell
git check-ignore -v local\some-file.txt
```

If it prints a rule, the file is ignored. If it prints nothing, the file
would be committed — fix `.gitignore` before staging.

## Suggested layout (optional)

```
local/
├── notes/          # Markdown notes, journals
├── scratch/        # Throwaway scripts and experiments
├── drafts/         # WIP versions of public docs
└── secrets/        # Tokens, .env files (avoid if possible)
```

None of these subfolders need to exist until you want them.
