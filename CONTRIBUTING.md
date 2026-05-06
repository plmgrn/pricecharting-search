# Contributing

Thanks for your interest in **Search on PriceCharting**. This document
explains how contributions work for this project, including a few quirks
caused by the licensing model.

## TL;DR

- The project is licensed under **AGPL-3.0**, with a parallel commercial
  licensing track offered by the maintainer (see [`NOTICE`](./NOTICE)).
- To keep the commercial-licensing option available, the maintainer —
  **Otto Palmgren** (GitHub: [`@plmgrn`](https://github.com/plmgrn)) —
  needs to remain the **sole copyright holder** of the code in this
  repository.
- Pull requests are very welcome as **proposals**, but substantive PRs may
  be **closed and reimplemented** by the maintainer rather than merged
  verbatim. Your idea will still ship; the implementation will be rewritten.
- You will be credited in the commit message and/or `CHANGELOG.md`.
- Trivial changes (typos, comment fixes, obvious one-liners) are usually
  merged as-is.

If that arrangement isn't what you want, please say so in your PR — we
can either work out a per-contributor agreement (CLA-style) or you can
maintain your contribution in your own fork under AGPL-3.0.

## Why this policy exists

The moment external code is merged into the repo, the contributor owns
the copyright on those lines. To later grant a commercial license that
covers the whole project (see [`NOTICE`](./NOTICE)), the maintainer would
need permission from every contributor. The "reimplementation" pattern
sidesteps that: ideas are not copyrighted, only their specific
expression is, so reading a PR and then writing a fresh implementation
is legally clean.

This isn't about gatekeeping — it's about keeping the project's
licensing options open without burdening contributors with paperwork.

## How to contribute

### Bug reports and feature ideas
Open an issue. Include:
- Browser + version (Firefox / Chrome / etc.).
- Extension version (from `manifest.json`).
- Steps to reproduce, expected vs actual behavior.

### Pull requests
1. Fork the repository.
2. Create a branch for your change.
3. Keep changes small and focused — one PR per concern.
4. Open the PR with a clear description of *what* and *why*.
5. Expect one of:
   - **Merged as-is** (typical for small fixes).
   - **Closed and reimplemented** by the maintainer (typical for new
     features). You'll be credited.
   - **Discussion** if the design needs iteration before either of the above.

### Coding style
- Plain ES modules, no build step, no framework.
- Use the `browser`/`chrome` shim in `src/lib/api.js`;
  don't hard-code one namespace.
- Keep the permissions footprint minimal. Any new permission needs a
  justification in the PR description.
- No telemetry. No remote code. No bundled tracking.

## License of contributions

By submitting a contribution, you confirm that:

- The contribution is your own work (or you have the right to submit it).
- You're submitting it under the terms of the project's AGPL-3.0 license.
- You understand that the maintainer may reimplement the change rather
  than merge it directly, in which case your original code is *not*
  incorporated into the project.
