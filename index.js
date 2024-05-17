'use strict';

const electron = require('electron');
const Config = require('@tjmc/config');
const { debounce } = require('./util/Schedulers');
const LoggerUtil = require('./util/LoggerUtil');

module.exports = function (options) {

	const DEFAULT_WINDOW_CONFIG = {
		x: undefined,
		y: undefined,
		width: options.width || 1280,
		height: options.height || 720,
		isMaximized: false,
		isFullScreen: false
	};

	const logger = LoggerUtil('%c[WindowState]', 'color: #d59215; font-weight: bold', false);

	const config = new Config({
		configDir: launcherDir,
		configName: 'window.state',
		defaultConfig: DEFAULT_WINDOW_CONFIG,
		logger: logger,
	});

	const loadWindowState = function () {
		config.load();
	}

	const getWindowState = function () {
		return config.getOption();
	}

	const setWindowState = function (state) {
		return config.setOption(state);
	}

	loadWindowState();
	const screen = electron.screen || electron.remote.screen;
	let state, winRef;

	function isNormal(win) {
		return !win.isMinimized() && !win.isMaximized() && !win.isFullScreen()
	}

	function hasBounds() {
		return (
			state &&
			Number.isInteger(state.width) && state.width > 0 &&
			Number.isInteger(state.height) && state.height > 0
		)
	}

	function resetStateToDefault() {
		state = DEFAULT_WINDOW_CONFIG;
	}

	function windowWithinBounds(bounds) {
		return (
			state.x >= bounds.x &&
			state.y >= bounds.y &&
			state.x + state.width <= bounds.x + bounds.width &&
			state.y + state.height <= bounds.y + bounds.height
		)
	}

	function ensureWindowVisibleOnSomeDisplay() {
		const visible = screen.getAllDisplays().some(display => {
			return windowWithinBounds(display.bounds)
		})

		if (!visible) {
			return resetStateToDefault()
		}
	}

	function validateState() {
		const isValid = state && (hasBounds() || state.isMinimized || state.isMaximized || state.isFullScreen)
		if (!isValid) {
			state = null
			return
		}

		if (hasBounds() && state.displayBounds) {
			ensureWindowVisibleOnSomeDisplay()
		}
	}

	const saveDebounce = debounce(() => saveState(), 800, false, true);

	function updateState(win) {
		win = win || winRef
		if (!win) return

		try {
			const winBounds = win.getBounds()
			if (isNormal(win)) {
				state.x = winBounds.x
				state.y = winBounds.y
				state.width = winBounds.width
				state.height = winBounds.height
			}
			state.isMinimized = win.isMinimized()
			state.isMaximized = win.isMaximized()
			state.isFullScreen = win.isFullScreen()
			state.displayBounds = screen.getDisplayMatching(winBounds).bounds
		} catch (err) { }
	}

	function saveState(win) {
		// logg.info(state)
		if (win) updateState(win)
		setWindowState(state)
	}

	function stateHandler() {
		updateState();
		saveDebounce();
	}

	function closedHandler() {
		unmanage();
		saveState();
	}

	function manage(win) {
		if (state.isMinimized) {
			win.minimize()
		}
		if (state.isMaximized) {
			win.maximize()
		}
		if (state.isFullScreen) {
			win.setFullScreen(true)
		}
		win.on('resize', stateHandler)
		win.on('move', stateHandler)
		win.on('close', stateHandler)
		win.on('closed', closedHandler)
		winRef = win
	}

	function unmanage() {
		if (winRef) {
			winRef.removeListener('resize', stateHandler)
			winRef.removeListener('move', stateHandler)
			winRef.removeListener('close', stateHandler)
			winRef.removeListener('closed', closedHandler)
			winRef = null
		}
	}

	state = getWindowState()

	validateState()

	state = Object.assign(DEFAULT_WINDOW_CONFIG, state);

	return {
		get x() { return state.x },
		get y() { return state.y },
		get width() { return state.width },
		get height() { return state.height },
		get isMaximized() { return state.isMaximized },
		get isMinimized() { return state.isMinimized },
		get isFullScreen() { return state.isFullScreen },
		saveState,
		unmanage,
		manage,
		resetStateToDefault
	}
}

/* =====================   Window Properties   ===================== */

