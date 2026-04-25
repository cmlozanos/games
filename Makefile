GIT_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))

.DEFAULT_GOAL := help

help:
	@echo "Games monorepo"
	@echo ""
	@echo "Submodules:"
	@echo "  banana-party                  Monkey Jumper to achieve all banana at the mountain"
	@echo "  fancy-jumping-car             Car jumping game"
	@echo "  jump-the-car                  Game for children - Jump the car"
	@echo "  quasar-firebase-memory-cards  Memory card game"
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
