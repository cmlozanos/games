.PHONY: serve run stop help

.DEFAULT_GOAL := help

PORT ?= 7777
HOST ?= localhost

run: serve

serve:
	@python3 -m http.server $(PORT) --bind $(HOST)

stop:
	@lsof -ti:$(PORT) | xargs kill -9 2>/dev/null || echo "No server running on port $(PORT)"

help:
	@echo "Little Chef Academy"
	@echo "  make serve PORT=$(PORT) HOST=$(HOST)"
