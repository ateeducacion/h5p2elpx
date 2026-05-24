# Makefile for h5p2elpx
# Convenience wrappers around the bun scripts. Style aligned with the
# eXeLearning Makefile so contributors familiar with that project see
# the same verbs.

.DEFAULT_GOAL := help

# Detect bun
check-bun:
	@command -v bun >/dev/null 2>&1 || { \
		echo "[ERROR] Bun is not installed. Install from https://bun.sh"; \
		exit 1; \
	}

# Install dependencies (first run / after pulls)
install: check-bun
	bun install

# Run biome lint (read-only — fails on issues)
lint: check-bun
	bunx biome check .

# Auto-fix what biome can fix, then run typecheck
fix: check-bun
	bunx biome check --write .

# Typecheck
typecheck: check-bun
	bunx tsc --noEmit

# Run the test suite once
test: check-bun
	bunx vitest run

# Watch-mode tests
test-watch: check-bun
	bunx vitest

# Fetch the pinned eXeLearning static editor used by the e2e compat test
fetch-editor: check-bun
	bun run e2e:fetch-editor

# Run the Playwright e2e compatibility test (skips if editor not fetched)
test-e2e: check-bun
	bun run test:e2e

# Same, with the Playwright UI runner
test-e2e-ui: check-bun
	bun run test:e2e:ui

# Run only the OPEN_FILE smoke spec — fast sanity check
test-e2e-smoke: check-bun
	bun run test:e2e -- _smoke

# Build the eXeLearning template (download official static bundle)
template: check-bun
	bun run build-template
	cp fixtures/elpx/template.elpx packages/web/public/template.elpx

# Start the web dev server (Vite). Default port 5173.
up: check-bun
	bun run --cwd packages/web dev

# Build the production web bundle
web-build: check-bun
	bun run --cwd packages/web build

# CI / pre-push gate: typecheck + lint + tests
ci: check-bun
	bunx tsc --noEmit
	bunx biome check .
	bunx vitest run

help:
	@echo "h5p2elpx — make targets"
	@echo ""
	@echo "  make install     Install dependencies"
	@echo "  make lint        Run biome lint (read-only)"
	@echo "  make fix         Auto-fix lint + formatting"
	@echo "  make typecheck   Run tsc --noEmit"
	@echo "  make test        Run vitest once"
	@echo "  make test-watch  Run vitest in watch mode"
	@echo "  make fetch-editor   Download pinned eXeLearning static editor for e2e"
	@echo "  make test-e2e       Run Playwright editor-compat e2e (skips without editor)"
	@echo "  make test-e2e-smoke Run only the fast OPEN_FILE smoke spec"
	@echo "  make test-e2e-ui    Run Playwright e2e with the UI runner"
	@echo "  make template    Rebuild fixtures/elpx/template.elpx from upstream"
	@echo "  make up          Start the web dev server"
	@echo "  make web-build   Build the production web bundle"
	@echo "  make ci          Run the same gate CI runs"

.PHONY: check-bun install lint fix typecheck test test-watch fetch-editor test-e2e test-e2e-smoke test-e2e-ui template up web-build ci help
