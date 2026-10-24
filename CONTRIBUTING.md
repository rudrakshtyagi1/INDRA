# Contributing to INDRA

Use the [repository guide](docs/repository_structure.md) to choose where a file
belongs. Keep the root for project documentation, Makefile, and shared configuration.

- Edit application source directly. Do not commit temporary `patch_*.py`, code
  generators that overwrite application files, backups, or local debug output.
- Put reusable scientific workflows in `scripts/modelling/` or `scripts/analysis/`;
  put manual data checks in `scripts/diagnostics/`. Use `scratch/` for experiments.
- Put regression tests in `backend/tests/` or `frontend/src/tests/`. A script that
  inspects local data or calls a credentialed service is a diagnostic, not a test.
- Keep reports in `docs/reports/` and methodology in `docs/`.
- Keep generated solver grids, downloaded solver checkouts, credentials, virtual
  environments, and build outputs out of Git. Preserve small, reviewed scientific
  inputs, configuration, provenance, and benchmark summaries.
- Never remove data or older modules solely because their names look obsolete.
  Trace application, test, workflow, and scientific artifact references first.

Stage intended changes, then run:

```bash
make check-structure
make test
make build-frontend
cd frontend && npm run lint
```

Activate your Python environment before running backend checks. The structure
check inspects the Git index, so run it after `git add`. It also runs in CI.
New top-level files or directories require an intentional update to the guide and
the allowlist in `scripts/check_repository_structure.py`.
