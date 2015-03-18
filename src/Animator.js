(function(global){

var Animator, Internal, _typeOf, _toStringRegex, _isElementRegex,
	_requestAnimationFrame, _performance, _nowOffset, _startsWithRegex,
	_unitRegex, _timingRegex, _isTransform, _dateNow,
	_getComputedStyle, _parseTransformRegex, _replacePipeRegex, _replaceSpaceRegex;

_toStringRegex   = /(\[object\ |\])/g;
_isElementRegex  = /html[\w]*element/;
_startsWithRegex = /^_/;
_unitRegex       = /^[-0-9.]+/;
_timingRegex     = /-/g;
_isTransform     = /[Tt]ransform$/;
_parseTransformRegex = /([0-9\w]+)\(([-0-9,.%\w]*)\)/;
_replaceSpaceRegex = /[\ \s]/g;
_replacePipeRegex = /\)/g;

// Simple typeOf checker
_typeOf = function(toTest){
	var type;

	type = Object.prototype.toString.call(toTest)
		.replace(_toStringRegex, '')
		.toLowerCase();

	if (_isElementRegex.test(type)) {
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
_performance = global.performance || {};

if (!_performance.now) {
	_nowOffset = _dateNow();

	if (
		_performance.timing &&
		_performance.timing.navigationStart
	) {
		_nowOffset = _performance.timing.navigationStart;
	}

	_performance.now = function now(){
		return _dateNow() - _nowOffset;
	};
}

// MDN Function.prototype.bind polyfill
if (!Function.prototype.bind) {
	Function.prototype.bind = function (oThis) {
		var aArgs, fToBind, NOP, fBound;

		if (typeof this !== "function") {
			throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
		}

		aArgs = Array.prototype.slice.call(arguments, 1);
		fToBind = this;
		NOP = function(){};

		fBound = function() {
			return fToBind.apply(
				this instanceof NOP && oThis ? this : oThis,
				aArgs.concat(Array.prototype.slice.call(arguments))
			);
		};

		NOP.prototype = this.prototype;
		fBound.prototype = new NOP();

		return fBound;
	};
}

_getComputedStyle = window.getComputedStyle || function(element){
	return element.style;
};

Internal = {

	isRunning: false,

	_index: 0,
	_last: undefined,

	elements  : {},
	animating : [],
	toRemove  : [],

	addTweens: function(element, tweens){
		var id, previousTweens;

		// Element is currently animating
		if (element._animatorID) {
			id = element._animatorID;
			previousTweens = this.elements[id];
			if (previousTweens) {
				this.elements[id] = previousTweens.concat.apply(this.elements[id], tweens);
			} else {
				this.elements[id] = tweens;
			}
			this.elements[id].element = element;
			return;
		}

		tweens.element = element;
		id = element._animatorID = 'anim-' + this._index++;
		this.elements[id] = tweens;
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
			if (anims[0].type === 'tween' && !anims[0].paused) {
				done = Internal.updateTween(anims.element, anims[0], tick);
				if (done) {
					if (anims[0].to._callback) {
						anims[0].to._callback();
					}
					// Splice seems to eek out a few small milliseconds over shift
					anims.splice(0, 1);
				}

				if (done && !anims.length) {
					// toRemove[toRemove.length] = animating[a];
					toRemove.push(animating[a]);
				}
			}
		}

		Internal._last = now;
	},

	updateTween: function(element, tween, tick){
		var delta, prop, timing, value;

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

		timing = tween.from._timing || Animator.TWEENS.LINEAR;

		for (prop in tween.from) {
			if (_startsWithRegex.test(prop) || !tween.from[prop]) {
				continue;
			}

			if (_isTransform.test(prop)) {
				value = Internal.calculateTransform(
					tween.from[prop],
					tween.to[prop],
					timing,
					delta,
					tween.duration
				);
			} else {
				if (delta >= tween.duration) {
					value = tween.to[prop][0];
				} else {
					value = timing(
						delta,
						tween.from[prop][0],
						tween.to[prop][0] - tween.from[prop][0],
						tween.duration
					);
				}
				value = value + (tween.from[prop][1] || 0);
			}

			element.style[prop] = value;
		}

		if (delta >= tween.duration) {
			return true;
		} else {
			return false;
		}
	},

	calculateTransform: function(from, to, timing, delta, duration){
		var css = '',
			v, len, currentValue, item, prop;

		for (prop in from) {
			item = prop + '(';
			len = from[prop].length;

			for (v = 0; v < len; v++) {
				if (delta >= duration) {
					currentValue = to[prop][v][0];
				} else {
					currentValue = timing(
						delta,
						from[prop][v][0],
						to[prop][v][0] - from[prop][v][0],
						duration
					);
				}
				if (from[prop][v][1]) {
					currentValue += from[prop][v][1];
				}
				item += currentValue;
				if (v < from[prop].length - 1) {
					item += ',';
				}
			}

			item += ')';
			css += ' ' + item;
		}

		return css;
	},

	updateSpring: function(element, spring){
		console.log('Internal.updateSpring not yet implemented');
		return false;
	},

	// Converts a JSON frame to valid tween frame - done
	// via duplication, the original frame is not modified
	convertFrame: function(frame, previousFrame){
		var newFrame = {},
			key, timingKey, val;

		if (_typeOf(frame) !== 'object') {
			return frame;
		}

		for (key in frame) {
			if (!frame.hasOwnProperty(key)) {
				continue;
			}

			if (key === '_timing' && _typeOf(frame[key]) === 'string') {
				timingKey = frame[key].toUpperCase().replace(_timingRegex, '_');
				newFrame[key] = Animator.TWEENS[timingKey];
				continue;
			}

			if (_isTransform.test(key)) {
				val = Internal.convertTransform(frame[key]);
			} else {
				val = Internal.getValueAndUnit(frame[key], key);
			}

			// Use prefixed key if it exists
			if (_startsWithRegex.test(key)) {
				key = Animator.findPrefix(key);
			}
			newFrame[key] = val;
		}

		if (previousFrame) {
			Internal.matchMissingKeys(newFrame, previousFrame);
		}

		return newFrame;
	},

	convertTransform: function(transform){
		var key, value, i, len;

		for (key in transform) {
			value = transform[key];
			if (_typeOf(value) !== 'array') {
				transform[key] = value = [value];
			}
			for (i = 0, len = value.length; i < len; i++) {
				value[i] = Internal.getValueAndUnit(value[i], key);
			}
		}

		return transform;
	},

	keyframesToTweens: function(animation, duration){
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

		to   = undefined;
		from = undefined;
		fromPercent = undefined;
		toPercent   = undefined;

		return tweens;
	},

	getValueAndUnit: function(item, prop){
		var value, unit, newValue;

		if (_typeOf(item) !== 'number' && _typeOf(item) !== 'string') {
			return item;
		}

		value = parseFloat(item);
		if (isNaN(value)) {
			return [item];
		}

		newValue = [value];
		if (item && item.replace) {
			unit = item.replace(_unitRegex, '');
		}

		// Only add a unit if it exists
		if (unit || Animator.DEFAULT_UNITS[prop]) {
			newValue[1] = unit || Animator.DEFAULT_UNITS[prop];
		}

		return newValue;
	},

	matchMissingKeys: function(base, from){
		var key, isTransform;

		for (key in from) {
			if (_startsWithRegex.test(key)) {
				continue;
			}

			isTransform = _isTransform.test(key);
			if (!isTransform && base[key]) {
				continue;
			}

			if (isTransform) {
				base[key] = Internal.matchMissingKeys(
					base[key] || {},
					from[key]
				);
			} else {
				base[key] = from[key];
			}
		}

		return base;
	},

	getFromTween: function(element, to){
		var from = {},
			cStyle = _getComputedStyle(element),
			key;

		for (key in to) {
			if (_isTransform.test(key)) {
				// Never use computed style for transforms or we lose
				// our transforms to a matrix
				from[key] = Animator.parseTransformString(element.style[key]);
			} else if (_startsWithRegex.test(key)) {
				from[key] = to[key];
			} else {
				from[key] = element.style[key] || cStyle[key] || 0;
			}
		}

		from = Internal.convertFrame(from);
		Internal.matchMissingKeys(to, from);

		return from;
	}

};

Animator = function(){
	this._animations = {};
};

Animator.prototype = {

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

	springElement: function(name, physics){
		return this;
	},

	tweenElement: function(element, duration){
		var from, to, tween;
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

		if (arguments.length >= 4) {
			from = Internal.convertFrame(arguments[2]);
			to   = Internal.convertFrame(arguments[3], from);
		} else {
			to = Internal.convertFrame(arguments[2]);
		}

		tween = {
			type     : 'tween',
			duration : duration,
			from     : from,
			to       : to
		};

		Internal.addTweens(element, [tween]);

		return this;
	},

	animateElement: function(element, animation, duration){
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
			duration
		);

		Internal.addTweens(element, tweens);

		return this;
	},

	clearTweenQueue: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element || !element._animatorID) {
			return this;
		}

		Internal.toRemove.push(element._animatorID);

		return this;
	},

	pauseElement: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element || !element._animatorID) {
			return this;
		}

		if (Internal.elements[element._animatorID]) {
			Internal.elements[element._animatorID][0].paused = true;
		}

		return this;
	},

	resumeElement: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element && !element._animatorID) {
			return this;
		}

		if (Internal.elements[element._animatorID]) {
			Internal.elements[element._animatorID][0].paused = false;
		}

		return this;
	},

	getCurrentAnimation: function(element){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (!element || !element._animatorID) {
			return null;
		}

		if (Internal.elements[element._animatorID]) {
			return Internal.elements[element._animatorID][0];
		}

		return null;
	}

};

Animator.parseTransformString = function(string){
	var x, styles, transforms, match;

	if (_typeOf(string) !== 'string') {
		return undefined;
	}

	// Clean out whitespace and add split separator
	string = string
		.replace(_replaceSpaceRegex, '')
		.replace(_replacePipeRegex, ')|');

	styles = string.split('|');
	transforms = {};

	for (x = 0; x < styles.length; x++) {
		match = styles[x].match(_parseTransformRegex);
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


Animator.DEFAULT_UNITS = {
	translate3d : 'px',
	translate   : 'px',
	translateX  : 'px',
	translateY  : 'px',
	translateZ  : 'px',
	perspective : 'px',

	top    : 'px',
	left   : 'px',
	bottom : 'px',
	right  : 'px',
	height : 'px',
	width  : 'px',
	margin : 'px'
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

global.Animator = Animator;

})(this);
