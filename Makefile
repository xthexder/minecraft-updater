prepare:
	npm install

dev:
	supervisor -n error minecraft-updater.js

run:
	node minecraft-updater.js
