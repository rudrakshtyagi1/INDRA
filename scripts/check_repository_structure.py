"""Reject misplaced source files and generated artifacts in the Git index.

Run after staging changes. Uses only the Python standard library; local ignored
simulation results are intentionally outside this check.
"""

from pathlib import Path, PurePosixPath
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {
    ".dockerignore", ".env.example", ".gitignore", "CONTRIBUTING.md",
    "LICENSE", "Makefile", "README.md", "docker-compose.yml",
}
ROOT_DIRECTORIES = {
    ".github", "backend", "configs", "data", "docs", "frontend", "infra",
    "scripts", "storage", "workers",
}
GENERATED_SUFFIXES = {
    ".pyc", ".pyo", ".bak", ".orig", ".rej", ".wd", ".elev", ".dem",
    ".max", ".inittm", ".maxtm", ".mxe", ".totaltm", ".bi4", ".ibi4",
    ".obi4", ".vtk", ".vrt", ".tif", ".tiff", ".asc",
}
GENERATED_DIRECTORIES = {"node_modules", "__pycache__", ".venv", ".pytest_cache", "scratch"}


def problem_for(path):
    path = PurePosixPath(path)
    if len(path.parts) == 1 and path.name not in ROOT_FILES:
        return "place scripts in scripts/ and reports in docs/reports/"
    if len(path.parts) > 1 and path.parts[0] not in ROOT_DIRECTORIES:
        return "use a documented top-level directory"
    if path.suffix in GENERATED_SUFFIXES or path.name.endswith(("~", ".asc.aux.xml", "_ascii.prj")):
        return "keep generated artifacts and backups outside version control"
    if GENERATED_DIRECTORIES.intersection(path.parts) or path.parts[:2] == ("frontend", "dist"):
        return "do not commit local environments, caches, or build outputs"
    if path.parts[0] == "data" and path.suffix in {".py", ".sh", ".js"}:
        return "place executable workflows in scripts/"
    return None


def main():
    entries = subprocess.check_output(
        ["git", "ls-files", "--stage", "-z"], cwd=ROOT,
    ).decode().split("\0")
    errors = []
    for entry in filter(None, entries):
        metadata, path = entry.split("\t", 1)
        problem = problem_for(path)
        if metadata.startswith("160000 "):
            problem = "external solver checkouts belong outside the Git index"
        if problem:
            errors.append(f"{path}: {problem}")
    if errors:
        print("Repository structure check failed:\n" + "\n".join(errors), file=sys.stderr)
        return 1
    print("Repository structure check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
