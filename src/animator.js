/* global module, define */
(function(root, factory) {
	if (typeof exports === 'object') {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define(
			'transformer',
			[],
			factory
		);
	} else {
		root.Animator = factory();
	}
})(this, function() {

var Animator, REGEX, Internal, _typeOf, _requestAnimationFrame, _performance,
	_nowOffset, _dateNow, _getComputedStyle, _toCamelCase;

REGEX = {
	digit            : /^[-0-9.]+/,
	timing           : /-/g,
	toString         : /(\[object\ |\])/g,
	isElement        : /html[\w]*element/,
	camelCase        : /-\D/g,
	startsWith       : /^_/,
	replacePipe      : /\)/g,
	isColorFunc      : /^(rgb|hsl)/,
	replaceSpace     : /[\ \s]/g,
	isScale          : /scale/,
	defaultPixel     : /(translate|perspective|top|left|bottom|right|height|width|margin|padding|border)/,
	containsCSSFunc  : /[()]/,
	parseCSSFunction : /([0-9\w]+)\(([-0-9,.%\w]*)\)/,
	isTransform      : /[tT]ransform/,
	springParse      : /[\[{]([\w\d]+)[\]}]([-0-9,.%\w]*)/
};

// Simple typeOf checker
_typeOf = function(toTest){
	var type;

	type = Object.prototype.toString.call(toTest)
		.replace(REGEX.toString, '')
		.toLowerCase();

	if (REGEX.isElement.test(type)) {
		return 'element';
	}

	return type;
};

// Simple requestAnimationFrame polyfill
_requestAnimationFrame =
	window.requestAnimationFrame       ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	function(callback){
		window.setTimeout(callback, 1000 / 60);
	};


// Date.now polyfill
if (!Date.now) {
	_dateNow = function now() {
		return new Date().getTime();
	};
} else {
	_dateNow = Date.now;
}

// Simple window.performance polyfill
_performance = window.performance || {};

if (!_performance.now) {
	if (
		_performance.timing &&
		_performance.timing.navigationStart
	) {
		_nowOffset = _performance.timing.navigationStart;
	} else {
		_nowOffset = _dateNow();
	}

	_performance.now = function now(){
		return _dateNow() - _nowOffset;
	};
}

_getComputedStyle = window.getComputedStyle || function(element){
	return element.style;
};

// Copied from MooTools
_toCamelCase = function(string){
	return string.replace(REGEX.camelCase, function(match){
		return match.charAt(1).toUpperCase();
	});
};

Internal = {

	isRunning: false,

	_index: 0,
	_last: undefined,

	elements  : {},
	animating : [],
	toRemove  : [],

	addItem: function(type, element, tween){
		var idKey = '_' + type + 'ID',
			id    = element[idKey],
			previousTweens;

		// Element is currently animating
		if (!id) {
			id = element[idKey] = type + '-' + this._index++;
		}

		previousTweens = this.elements[id];
		if (previousTweens) {
			// this.elements[id] = previousTweens.concat.apply(this.elements[id], tweens);
			// this.elements[id].element = element;
			// Trying out apply to reduce garbage... even if it's a bit slower...
			if (_typeOf(tween) === 'array') {
				previousTweens.push.apply(previousTweens, tween);
			} else {
				previousTweens.push(tween);
			}
			return;
		}

		if (_typeOf(tween) === 'array') {
			this.elements[id] = tween;
		} else {
			this.elements[id] = [tween];
		}
		this.elements[id].element = element;
		this.animating.push(id);

		this.start();
	},

	start: function(){
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		_requestAnimationFrame(this.run);
	},

	run: function(){
		var animating = Internal.animating,
			toRemove  = Internal.toRemove,
			a, len, anims, now, done, index, id, tick;

		if (window.stats) {
			window.stats.begin();
		}
		if (Internal.isRunning) {
			_requestAnimationFrame(Internal.run);
		} else {
			return;
		}

		now = _performance.now();

		if (Internal._last === undefined) {
			Internal._last = now;
		}

		tick = now - Internal._last;

		for (a = 0, len = animating.length; a < len; a++) {
			anims = Internal.elements[animating[a]];
			if (anims[0].paused) {
				continue;
			}

			if (anims[0].type === 'tween') {
				done = Internal.updateTween(anims.element, anims[0], tick);
				if (done) {
					if (anims[0].to._onFrame) {
						anims[0].to._onFrame(anims.element, anims[0]);
					}
					if (anims[0].to._finished) {
						anims[0].to._finished(anims.element, anims[0]);
					}
					// Splice seems to eek out a few small milliseconds over shift
					anims.splice(0, 1);
				}

				if (done && !anims.length) {
					// toRemove[toRemove.length] = animating[a];
					toRemove.push(animating[a]);
				}
				continue;
			}

			if (anims[0].type === 'spring') {
				Internal.updateSpring(anims.element, anims[0], tick);
				continue;
			}
		}

		if (toRemove.length) {
			for (a = 0, len = toRemove.length; a < len; a++) {
				id = toRemove[a];
				Internal.elements[id] = undefined;
				index = animating.indexOf(id);
				if (index >= 0) {
					animating.splice(index, 1);
				}
			}

			// No need to run anymore
			if (!animating.length) {
				Internal._last = undefined;
				Internal.isRunning = false;
			}

			// Clean out the array
			toRemove.length = 0;
		}

		Internal._last = now;
		if (window.stats) {
			window.stats.end();
		}
	},

	updateTween: function(element, tween, tick){
		var delta, prop, timing, from, to, duration;

		if (!tween.from) {
			tween.from = Internal.getFromTween(element, tween.to);
		}

		if (tween.delta === undefined) {
			tween.delta = 0;
		} else {
			tween.delta += tick;
		}

		if (tween.delay && tween.delay > tween.delta) {
			return false;
		} else if (tween.delay) {
			delta = tween.delta - tween.delay;
		} else {
			delta = tween.delta;
		}

		from = tween.from;
		to = tween.to;
		duration = tween.duration;

		timing = tween.from._timing || Animator.TWEENS.LINEAR;

		for (prop in from) {
			if (REGEX.startsWith.test(prop) || !from[prop]) {
				continue;
			}

			element.style[prop] = Internal.getTweenStyle(
				from[prop],
				to[prop],
				timing,
				delta,
				duration
			);
		}

		if (delta >= duration) {
			return true;
		} else {
			return false;
		}
	},

	getTweenStyle: function(from, to, timing, delta, duration, separator){
		var value, x, prop, currentValue;
		if (from.length) {
			value = '';
			for (x = 0; x < from.length; x += 2) {
				if (x > 0) {
					if (separator) {
						value += separator;
					}
					value += ' ';
				}

				if (delta >= duration) {
					value += to[x] + to[x + 1];
					continue;
				}

				// String CSS values that cannot be tweened, will
				// simply accept the from value until the animation
				// is finished
				if (from[x].length) {
					currentValue = from[x];
				} else {
					currentValue = timing(
						delta,
						from[x],
						to[x] - from[x],
						duration
					);
				}

				if (from[x + 1] === 'int') {
					currentValue = currentValue >> 0;
				} else if (from[x + 1]) {
					currentValue += from[x + 1];
				}

				value += currentValue;
			}
		} else {
			value = '';
			for (prop in from) {
				if (!from[prop]) {
					continue;
				}

				value += prop + '(';
				value += Internal.getTweenStyle(
					from[prop],
					to[prop],
					timing,
					delta,
					duration,
					','
				);

				value += ') ';
			}
		}

		return value;
	},

	updateSpring: function(element, spring, tick){
		var name, styles;

		styles  = spring.styles;
		tick   = tick / 1000;

		for (name in styles) {
			element.style[name] = Internal.getSpringStyle(
				styles[name],
				spring,
				tick
			);
		}

		return false;
	},

	getSpringStyle: function(items, spring, tick, separator){
		var value = '', name, x, key, accel, vel, pos, target;

		target = spring.target;
		pos    = spring.pos;
		vel    = spring.vel;
		accel  = spring.accel;

		if (items.length) {
			for (x = 0; x < items.length; x += 2) {
				value += ' ';
				if (x > 0 && separator) {
					value += separator;
				}
				if (typeof pos[items[x]] !== 'undefined') {
					key = items[x];

					accel[key] = spring.stiffness * (target[key] - pos[key]) - spring.friction * vel[key];
					if (Math.abs(accel[key]) < spring.threshold) {
						accel[key] = 0;
						vel[key] = 0;
						pos[key] = target[key];
					} else {
						vel[key] += accel[key] * tick;
						pos[key] += vel[key] * tick;
					}
					value += pos[key];
				} else {
					value +=  items[x];
				}
				if (items[x + 1]) {
					value += items[x + 1];
				}
			}
		} else {
			for (name in items) {
				value = name + '(';
				value += Internal.getSpringStyle(items[name], spring, tick, ',');
				value += ')';
			}
		}

		return value;
	},

	// Converts a JSON frame to valid tween frame - done
	// via duplication, the original frame is not modified
	convertFrame: function(frame, previousFrame){
		var newFrame = Internal.convertObject(frame);

		if (previousFrame) {
			Internal.matchMissingKeys(newFrame, previousFrame);
		}

		return newFrame;
	},

	convertObject: function(obj){
		var newObject = {},
			key, timingKey, value;

		for (key in obj) {
			if (!obj.hasOwnProperty(key)) {
				continue;
			}

			if (key === '_timing' && _typeOf(obj[key]) === 'string') {
				timingKey = obj[key].toUpperCase().replace(REGEX.timing, '_');
				value = Animator.TWEENS[timingKey] || Animator.TWEENS.LINEAR;
			} else if (_typeOf(obj[key]) === 'object') {
				value = Internal.convertObject(obj[key]);
			} else {
				value = Internal.getValueAndUnits(obj[key], key);
			}

			if (!REGEX.startsWith.test(key)) {
				key = _toCamelCase(key);
				key = Animator.findPrefix(key);
			}

			newObject[key] = value;
		}

		return newObject;
	},

	keyframesToTweens: function(animation, duration, finished){
		var tweens = [],
			from, to, fromPercent, toPercent, percent, tween;

		for (percent in animation) {
			if (!animation.hasOwnProperty(percent)) {
				continue;
			}

			if (!from) {
				from = animation[percent];
				fromPercent = parseFloat(percent) / 100;
				continue;
			}
			to = animation[percent];
			toPercent = parseFloat(percent) / 100;

			tween = {
				type     : 'tween',
				from     : from,
				to       : to,
				duration : ((duration * toPercent) - (duration * fromPercent)) >> 0
			};

			tweens.push(tween);

			from = to;
			fromPercent = toPercent;
		}

		if (_typeOf(finished) === 'function') {
			tweens[tweens.length - 1].to._finished = finished;
		}

		to   = undefined;
		from = undefined;
		fromPercent = undefined;
		toPercent   = undefined;

		return tweens;
	},

	getValueAndUnits: function(items, prop){
		var value, unit, x, match;

		if (
			_typeOf(items) !== 'number' &&
			_typeOf(items) !== 'string' &&
			_typeOf(items) !== 'array'
		) {
			return items;
		}

		if (_typeOf(items) === 'string') {
			items = items.split(' ');
		}

		if (_typeOf(items) !== 'array') {
			items = [items];
		}

		for (x = 0; x < items.length; x += 2) {
			unit = '';
			value = parseFloat(items[x]);
			match = (items[x] + '').match(REGEX.springParse);

			if (match) {
				items[x] = match[1];
				items.splice(x + 1, 0, match[2]);
				continue;
			}

			if (isNaN(value)) {
				items.splice(x + 1, 0, '');
				continue;
			}
			if (items[x] && items[x].replace) {
				unit = items[x].replace(REGEX.digit, '');
			}
			if (!unit && REGEX.defaultPixel.test(prop)) {
				unit = 'px';
			}
			if (!unit && REGEX.isColorFunc.test(prop) && x <= 4) {
				unit = 'int';
			}

			items[x] = value;
			items.splice(x + 1, 0, unit);
		}

		return items;
	},

	matchMissingKeys: function(base, from){
		var key, x, longer, shorter;

		for (key in from) {
			if (REGEX.startsWith.test(key)) {
				continue;
			}

			if (REGEX.isTransform.test(key)) {
				Internal.fixTransform(base[key], from[key]);
			} else if (_typeOf(from[key]) === 'object') {
				base[key] = Internal.matchMissingKeys(
					base[key] || {},
					from[key]
				);
			} else if (!base[key] && REGEX.isColorFunc.test(key)) {
				Internal.fixColor(key, key.match(REGEX.isColorFunc)[0], base, from);
			} else if (!base[key]){
				base[key] = from[key];
			}

			if (!base[key]) {
				continue;
			}

			// Extrapolate differing
			if (base[key].length !== from[key].length) {
				if (base[key].length > from[key].length) {
					longer  = base[key];
					shorter = from[key];
				} else {
					longer  = from[key];
					shorter = base[key];
				}
				for (x = shorter.length - 4; shorter.length < longer.length; x += 2) {
					if (x < 0) {
						x = 0;
					}
					shorter.push(shorter[x], shorter[x + 1]);
				}
			}
		}

		return base;
	},

	fixColor: function(key, baseKey, base, from){
		var key2 = baseKey + 'a';
		if (from[baseKey] && base[key2]) {
			from[key2] = from[baseKey];
			from[baseKey] = undefined;
			from[key2].push(1, '');
			return;
		}
		if (from[key2] && base[baseKey]) {
			base[key2] = base[baseKey];
			base[baseKey] = undefined;
			base[key2].push(1, '');
			return;
		}
		base[key] = from[key];
	},

	getFromTween: function(element, to){
		var from = {},
			cStyle = _getComputedStyle(element),
			key, value;

		for (key in to) {
			if (REGEX.startsWith.test(key)) {
				from[key] = to[key];
				continue;
			}

			value = element.style[key] || cStyle[key] || 0;
			if (REGEX.isTransform.test(key) && value === 'none') {
				value = {};
			} else if (REGEX.containsCSSFunc.test(value)) {
				value = Animator.parseCSSFunctionString(value);
			}

			from[key] = value;
		}

		from = Internal.convertFrame(from);
		Internal.matchMissingKeys(to, from);

		return from;
	},

	fixTransform: function(toTransform, fromTransform){
		var prop, x, isUnit;

		// Create default/zero transforms that don't
		// exist on the fromObject
		for (prop in toTransform) {
			// fromTransform
			if (fromTransform[prop]) {
				continue;
			}

			fromTransform[prop] = [];

			for (x = 0; x < toTransform[prop].length; x++) {
				isUnit = x % 2;
				if (isUnit) {
					fromTransform[prop][x] = toTransform[prop][x];
				} else {
					// Scale properties should default to 1,
					// everything else should default to 0
					fromTransform[prop][x] = REGEX.isScale.test(prop) ? 1 : 0;
				}
			}
		}

		for (prop in fromTransform) {
			if (toTransform[prop]) {
				continue;
			}
			toTransform[prop] = fromTransform[prop];
		}
	},

	setupSpring: function(element, settings){
		var name, previousSettings;

		// If there is a spring already set on the current element, update its
		// values, I probably need to do more about templating though.
		previousSettings = Internal.elements[element._springID];
		if (previousSettings) {
			previousSettings[0].stiffness = settings.stiffness;
			previousSettings[0].friction = settings.friction;
			return;
		}

		if (settings.styles) {
			settings.styles = Internal.convertObject(settings.styles);
		}

		settings.type = 'spring';
		settings.pos   = {};
		settings.vel   = {};
		settings.accel = {};
		for (name in settings.target) {
			settings.pos[name]   = settings.target[name];
			settings.vel[name]   = 0;
			settings.accel[name] = 0;
		}

		Internal.addItem('spring', element, settings);
	}

};

Animator = function(){
	this._animations = {};
};

Animator.prototype = {

	isRunning: function(){
		return Internal.isRunning;
	},

	addAnimation: function(name, keyframes){
		var frame, previousFrame;

		if (
			_typeOf(name)      !== 'string' ||
			_typeOf(keyframes) !== 'object'
		) {
			return this;
		}

		for (frame in keyframes) {
			keyframes[frame] = Internal.convertFrame(keyframes[frame], previousFrame);
			previousFrame = keyframes[frame];
		}

		this._animations[name] = keyframes;

		return this;
	},

	springElement: function(element, settings){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (_typeOf(settings) !== 'object') {
			throw new TypeError('Animator.springElement spring settings must be an object: ' + settings);
		}

		Internal.setupSpring(element, settings);

		return this;
	},

	tweenElement: function(element, duration){
		var from, to, tween, frames, callback;
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}
		if (_typeOf(element) !== 'element') {
			throw new Error(
				'Animator.tweenElement: Must provide a valid element to tween: ' + element
			);
		}
		if (_typeOf(duration) !== 'number') {
			throw new TypeError('Animator.tweenElement: Must provide a valid duration: ' + duration);
		}

		frames = Array.prototype.slice.call(arguments, 2);

		if (_typeOf(frames[frames.length - 1]) === 'function') {
			callback = frames.pop();
		}

		if (frames.length >= 2) {
			from = Internal.convertFrame(frames[0]);
			to   = Internal.convertFrame(frames[1], from);
		} else {
			to = Internal.convertFrame(frames[0]);
		}

		tween = {
			type     : 'tween',
			duration : duration,
			from     : from,
			to       : to
		};

		if (callback) {
			tween.to._finished = callback;
		}

		Internal.addItem('tween', element, tween);

		return this;
	},

	animateElement: function(element, animation, duration, finished){
		var tweens;

		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (_typeOf(element) !== 'element') {
			throw new Error('Animator.animate: Must provide a valid element to animate: ' + element);
		}

		duration = duration || 1000;

		if (!this._animations[animation]) {
			throw new Error('Animator.animateElement: Animation does not exist: ' + animation);
		}

		tweens = Internal.keyframesToTweens(
			this._animations[animation],
			duration,
			finished
		);

		Internal.addItem('tween', element, tweens);

		return this;
	},

	removeSpring: function(element){
		if (_typeOf(element) === 'spring') {
			element = document.getElementById(element);
		}

		if (!element || !element._springID) {
			return this;
		}

		if (Internal.isRunning) {
			Internal.toRemove.push(element._springID);
		}

		return this;
	},

	clearTweenQueue: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element || !element._tweenID) {
			return this;
		}

		if (Internal.isRunning) {
			Internal.toRemove.push(element._tweenID);
		}

		return this;
	},

	pauseElement: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element || !element._tweenID) {
			return this;
		}

		if (Internal.elements[element._tweenID]) {
			Internal.elements[element._tweenID][0].paused = true;
		}

		return this;
	},

	resumeElement: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element && !element._tweenID) {
			return this;
		}

		if (Internal.elements[element._tweenID]) {
			Internal.elements[element._tweenID][0].paused = false;
		}

		return this;
	},

	getCurrentAnimation: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element || !element._tweenID) {
			return null;
		}

		if (Internal.elements[element._tweenID]) {
			return Internal.elements[element._tweenID][0];
		}

		return null;
	}

};

Animator.parseCSSFunctionString = function(string){
	var x, styles, transforms, match;

	if (
		_typeOf(string) !== 'string' ||
		!REGEX.containsCSSFunc.test(string)
	) {
		return undefined;
	}

	// Clean out whitespace and add split separator
	string = string
		.replace(REGEX.replaceSpace, '')
		.replace(REGEX.replacePipe, ')|');

	styles = string.split('|');
	transforms = {};

	for (x = 0; x < styles.length; x++) {
		match = styles[x].match(REGEX.parseCSSFunction);
		if (!match || match.length <= 2) {
			continue;
		}

		transforms[match[1]] = match[2].split(',');
	}

	return transforms;
};

// Find the appropriate vendored prefix for the given
// css prop. The non-prefixed prop will ALWAYS be preferred
// If nothing can be found, the original prop is returned.
Animator.findPrefix = function(prop){
	var toTest = ['webkit', 'moz', 'ms', 'o'], i, joined;

	toTest.unshift(prop);
	prop = prop.charAt(0).toUpperCase() + prop.slice(1);

	for (i = 0; i < toTest.length; i++) {
		if (i === 0) {
			joined = toTest[i];
		} else {
			joined = toTest[i] + prop;
		}
		if (document.body.style[joined] !== undefined) {
			return joined;
		}
	}

	return prop.toLowerCase();
};

Animator.TWEENS = {

	LINEAR: function (t, b, c, d) {
		return c * t / d + b;
	},

	EASE_IN_SINE: function (t, b, c, d) {
		return c * (1 - Math.cos(t / d * (Math.PI / 2))) + b;
	},

	EASE_OUT_SINE: function (t, b, c, d) {
		return c * Math.sin(t / d * (Math.PI / 2)) + b;
	},

	EASE_IN_OUT_SINE: function (t, b, c, d) {
		return c / 2 * (1 - Math.cos(Math.PI * t / d)) + b;
	},

	EASE_IN_QUAD: function (t, b, c, d) {
		return c * (t /= d) * t + b;
	},

	EASE_OUT_QUAD: function (t, b, c, d) {
		return -c * (t /= d) * (t - 2) + b;
	},

	EASE_IN_OUT_QUAD: function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return c / 2 * t * t + b;
		}
		return -c / 2 * ((--t) * (t - 2) - 1) + b;
	},

	EASE_IN_CIRC: function (t, b, c, d) {
		return c * (1 - Math.sqrt(1 - (t /= d) * t)) + b;
	},

	EASE_OUT_CIRC: function (t, b, c, d) {
		return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
	},

	EASE_IN_OUT_CIRC: function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return c / 2 * (1 - Math.sqrt(1 - t * t)) + b;
		}
		return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
	},

	EASE_IN_EXPO: function (t, b, c, d) {
		return c * Math.pow(2, 10 * (t / d - 1)) + b;
	},

	EASE_OUT_EXPO: function (t, b, c, d) {
		return c * (-Math.pow(2, -10 * t / d) + 1) + b;
	},

	EASE_IN_OUT_EXPO: function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
		}
		return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},

	EASE_IN_QUINT: function (t, b, c, d) {
		return c * Math.pow (t / d, 5) + b;
	},

	EASE_OUT_QUINT: function (t, b, c, d) {
		return c * (Math.pow (t / d - 1, 5) + 1) + b;
	},

	EASE_IN_OUT_QUINT: function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return c / 2 * Math.pow (t, 5) + b;
		}
		return c / 2 * (Math.pow (t -2, 5) + 2) + b;
	},

	EASE_IN_QUART: function (t, b, c, d) {
		return c * Math.pow (t / d, 4) + b;
	},

	EASE_OUT_QUART: function (t, b, c, d) {
		return -c * (Math.pow (t / d - 1, 4) - 1) + b;
	},

	EASE_IN_OUT_QUART: function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return c / 2 * Math.pow (t, 4) + b;
		}
		return -c / 2 * (Math.pow (t - 2, 4) - 2) + b;
	},

	EASE_IN_CUBIC: function (t, b, c, d) {
		return c * Math.pow (t / d, 3) + b;
	},

	EASE_OUT_CUBIC: function (t, b, c, d) {
		return c * (Math.pow(t / d - 1, 3) + 1) + b;
	},

	EASE_IN_OUT_CUBIC: function (t, b, c, d) {
		if ((t /= d / 2) < 1) {
			return c / 2 * Math.pow (t, 3) + b;
		}
		return c / 2 * (Math.pow (t - 2, 3) + 2) + b;
	}
};

// CSS Animation shortcuts...
Animator.TWEENS.EASE_IN     = Animator.TWEENS.EASE_IN_SINE;
Animator.TWEENS.EASE_OUT    = Animator.TWEENS.EASE_OUT_SINE;
Animator.TWEENS.EASE_IN_OUT = Animator.TWEENS.EASE_IN_OUT_SINE;

return Animator;

});
