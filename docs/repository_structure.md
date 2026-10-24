# Repository structure

| Location | Responsibility |
| --- | --- |
| `backend/floodlab/` | Primary FastAPI application, scientific engines, services, and schemas |
| `backend/hydrobreach/` | Earlier engines and compatibility API; still imported by INDRA and its tests |
| `backend/tests/` | Automated backend unit, API, and integration tests |
| `backend/migrations/` | Database migration scaffolding |
| `frontend/src/` | Active React application, starting at `main.jsx` → `App.jsx` |
| `configs/` | Application and scenario configuration |
| `scripts/` | Acquisition, preprocessing, pipeline entry points, and developer utilities |
| `scripts/modelling/sph/` | DualSPHysics preparation, execution, and discharge extraction |
| `scripts/modelling/lisflood/` | Terrain, boundary, solver, and conversion workflows |
| `scripts/analysis/exposure/` | Infrastructure exposure analysis |
| `scripts/analysis/routing/` | Routing experiments and temporal road analysis |
| `scripts/diagnostics/` | Manual inspection of local scientific datasets |
| `data/` | Scientific inputs, run configuration, provenance, and selected benchmark results |
| `docs/` | Methodology and architecture documentation |
| `docs/reports/` | Historical implementation and solver-test reports |
| `infra/` | Alternative root-context container builds and infrastructure notes |
| `workers/` | Worker scaffolding; not part of the default Compose stack |
| `storage/` | Local runtime outputs |
| `scratch/` | Ignored experiments and temporary work |

The default Compose stack uses `backend/Dockerfile` and `frontend/Dockerfile`.
The Dockerfiles in `infra/docker/` use a different build context and are retained
as alternative deployment scaffolding.

## Scientific files

Run scientific scripts from the repository root. Several benchmark workflows
still expect mounted `/workspace` or `/data` paths, external solver binaries, and
geospatial packages beyond the web requirements. Moving them into `scripts/`
does not make them portable or validate their numerical results. Inspect their
inputs and output paths before running them; many overwrite benchmark artifacts.

Generated depth/elevation grids, terrain sidecars, and particle metadata are
ignored. Small mass-balance and stage time series, QA reports, boundary inputs,
configuration, and provenance remain tracked. Full playback requires separately
supplied rasters, as described in the main README. Files removed from tracking
during cleanup were retained locally, and earlier committed versions remain in
Git history. This cleanup does not reduce the size of existing Git history.

## Cleanup decisions

The October 2026 cleanup traced frontend imports from the HTML entry point and
the standalone timing test, and backend references through APIs, engines, tests,
scripts, and workers. It removed an unreachable frontend tree, one-off source
patchers, no-op experiments, duplicate credential probes, and editor backups.
Scientific scripts previously mixed into the root and `data/` now live under
`scripts/`; historical reports moved into `docs/reports/`.

The `hydrobreach` package remains because active INDRA routers depend on it.
Versioned V2/V3/V4/V5 scientific configuration and historical reports are retained
for provenance. Their presence does not imply a completed or validated solver run.
The orphan LISFLOOD Git entry had no `.gitmodules` configuration; obtain that
external solver separately using the retained setup notes.

Use `git log --all -- <old-path>` to find a removed file, and
`git show <commit>:<old-path>` to inspect it without restoring it into the app.
