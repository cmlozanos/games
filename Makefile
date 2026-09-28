# Bundle sync only writes this repository; provide the canonical data directory explicitly.
LEARNING_SOURCE ?=
.PHONY: sync-gates check-gates

sync-gates:
	node tools/sync-learning-gate.mjs --source "$(LEARNING_SOURCE)"

check-gates:
	node tools/sync-learning-gate.mjs --check $(if $(LEARNING_SOURCE),--source "$(LEARNING_SOURCE)")

check: check-gates

GIT_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))

.DEFAULT_GOAL := help

.PHONY: check install-tests test test-touch test-profiles
check:
	$(MAKE) -C little-chef-academy check
	$(MAKE) -C burbujas check
	$(MAKE) -C buscaminas check
	node --check tests/catalogue-chef.spec.cjs
	node --check learning-profile.js
	node --check profiles.js
	node --check tests/profile-settings.spec.cjs

install-tests:
	npm ci

test:
	npm test

test-touch:
	npx --no-install playwright test tests/long-press.spec.cjs

test-profiles:
	npx --no-install playwright test tests/profile-settings.spec.cjs

help:
	@echo "Games monorepo"
	@echo ""
	@echo "Submodules:"
	@echo "  banana-party                  Monkey Jumper to achieve all banana at the mountain"
	@echo "  fancy-jumping-car             Car jumping game"
	@echo "  jump-the-car                  Game for children - Jump the car"
	@echo "  little-chef-academy           Educational cooking game for children"
	@echo "  world-of-joy                  World of Joy game"
	@echo ""
	@echo "Targets:"
	@echo "  make init          Init and clone all submodules (first time setup)"
	@echo "  make update        Pull latest changes in all submodules"
	@echo "  make status        Show status of all submodules"
	@echo "  make git-<cmd>     Run any git command on the parent repo"

init:
	@git submodule update --init --recursive

update:
	@git submodule update --remote --merge

status:
	@git submodule status

git-%:
	@git $* $(GIT_ARGS)

%:
	@:
