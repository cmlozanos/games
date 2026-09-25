.PHONY: help install install-browser icons check test test-browser test-published serve
.DEFAULT_GOAL := help

PORT ?= 8094
HOST ?= 127.0.0.1

help:
	@echo "Burbujas: make install | icons | check | test-browser | serve PORT=$(PORT)"

install:
	npm ci --ignore-scripts --registry=https://registry.npmjs.org

install-browser:
	npx --no-install playwright install chromium

icons:
	node tools/icons.cjs

check:
	node tools/core-check.cjs
	node tools/check.cjs

test: test-browser

test-browser:
	node tools/browser-check.cjs

test-published:
	BUBBLES_URL=https://cmlozanos.github.io/games/burbujas/ node tools/browser-check.cjs

serve:
	python3 -m http.server $(PORT) --bind $(HOST)
