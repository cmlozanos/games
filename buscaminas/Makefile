.DEFAULT_GOAL := help
.PHONY: help install icons check test test-browser test-published serve sync-gates
PORT ?= 8095
HOST ?= 127.0.0.1
LEARNING_SOURCE ?=

help:
	@echo "Buscaminas: make install | icons | check | test-browser | test-published | serve"

install:
	npm ci --ignore-scripts --registry=https://registry.npmjs.org

icons:
	node tools/icons.cjs

sync-gates:
	node tools/sync-learning-gate.mjs --source "$(LEARNING_SOURCE)"

check:
	node tools/sync-learning-gate.mjs --check
	node tools/core-check.cjs
	node tools/check.cjs

test: test-browser

# CHROME95_PATH selects the legacy browser; BROWSER=webkit selects WebKit.
# SCREENSHOT_DIR optionally saves each viewport. Test server is ephemeral and local.
test-browser:
	node tools/browser-check.cjs

test-published:
	MINES_URL=https://cmlozanos.github.io/games/buscaminas/ node tools/browser-check.cjs

serve:
	python3 -m http.server $(PORT) --bind $(HOST)
