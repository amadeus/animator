(function(global){

var Animator, Internal, _typeOf, _toStringRegex, _isElementRegex,
	_requestAnimationFrame, _performance, _nowOffset, _startsWithRegex,
	_unitRegex, _timingRegex, _dateNow, _containsCSSFunc,
	_getComputedStyle, _parseTransformRegex, _replacePipeRegex,
	_replaceSpaceRegex, _isColorFunc;

_toStringRegex   = /(\[object\ |\])/g;
_isElementRegex  = /html[\w]*element/;
_startsWithRegex = /^_/;
_unitRegex       = /^[-0-9.]+/;
_timingRegex     = /-/g;
_containsCSSFunc = /[()]/;
_parseTransformRegex = /([0-9\w]+)\(([-0-9,.%\w]*)\)/;
_replaceSpaceRegex = /[\ \s]/g;
_replacePipeRegex = /\)/g;
_isColorFunc = /^(rgb|hsl)/;

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
		var id = element._animatorID,
			previousTweens;

		// Element is currently animating
		if (!id) {
			id = element._animatorID = 'anim-' + this._index++;
		}

		previousTweens = this.elements[id];
		if (previousTweens) {
			// this.elements[id] = previousTweens.concat.apply(this.elements[id], tweens);
			// this.elements[id].element = element;
			// Trying out apply to reduce garbage... even if it's a bit slower...
			previousTweens.push.apply(previousTweens, tweens);
			tweens.length = 0;
			return;
		}

		this.elements[id] = tweens;
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
		var delta, prop, timing, value, from, to, duration, x;

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
			if (_startsWithRegex.test(prop) || !from[prop]) {
				continue;
			}

			if (from[prop].length) {
				value = '';
				for (x = 0; x < from[prop].length; x += 2) {
					value += ' ';
					if (delta >= duration) {
						value += to[prop][x] + to[prop][x + 1];
						continue;
					}

					// String CSS values that cannot be tweened, will
					// simply accept the from value until the animation
					// is finished
					if (from[prop][x].length) {
						value += from[prop][x];
					} else {
						value += timing(
							delta,
							from[prop][x],
							to[prop][x] - from[prop][x],
							duration
						);
					}
					if (from[prop][x + 1]) {
						value += from[prop][x + 1];
					}
				}
			} else {
				value = Internal.calculateCSSFunction(
					from[prop],
					to[prop],
					timing,
					delta,
					duration
				);
			}

			element.style[prop] = value;
		}

		if (delta >= duration) {
			return true;
		} else {
			return false;
		}
	},

	calculateCSSFunction: function(from, to, timing, delta, duration){
		var css = '',
			v, len, currentValue, item, prop;

		for (prop in from) {
			if (!from[prop]) {
				continue;
			}
			item = prop + '(';
			len = from[prop].length;

			for (v = 0; v < len; v += 2) {
				if (delta >= duration) {
					currentValue = to[prop][v];
				} else {
					currentValue = timing(
						delta,
						from[prop][v],
						to[prop][v] - from[prop][v],
						duration
					);
				}
				if (from[prop][v + 1] === 'int') {
					currentValue = currentValue >> 0;
				} else if (from[prop][v + 1]) {
					currentValue += from[prop][v + 1];
				}
				item += currentValue;
				if (v < from[prop].length - 2) {
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
				timingKey = obj[key].toUpperCase().replace(_timingRegex, '_');
				value = Animator.TWEENS[timingKey] || Animator.TWEENS.LINEAR;
			} else if (_typeOf(obj[key]) === 'object') {
				value = Internal.convertObject(obj[key]);
			} else {
				value = Internal.getValueAndUnits(obj[key], key);
			}

			if (!_startsWithRegex.test(key)) {
				key = Animator.findPrefix(key);
			}

			newObject[key] = value;
		}

		return newObject;
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

	getValueAndUnits: function(items, prop){
		var value, unit, x;

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

			if (isNaN(value)) {
				items.splice(x + 1, 0, '');
				continue;
			}
			if (items[x] && items[x].replace) {
				unit = items[x].replace(_unitRegex, '');
			}
			if (!unit && _isColorFunc.test(prop) && x <= 4) {
				unit = 'int';
			}

			items[x] = value;
			items.splice(x + 1, 0, unit || Animator.DEFAULT_UNITS[prop] || '');
		}

		return items;
	},

	matchMissingKeys: function(base, from){
		var key;

		for (key in from) {
			if (_startsWithRegex.test(key)) {
				continue;
			}

			if (_typeOf(from[key]) === 'object') {
				base[key] = Internal.matchMissingKeys(
					base[key] || {},
					from[key]
				);
			} else if (!base[key] && _isColorFunc.test(key)) {
				Internal.fixColor(key, key.match(_isColorFunc)[0], base, from);
			} else if (!base[key]){
				base[key] = from[key];
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
			if (_startsWithRegex.test(key)) {
				from[key] = to[key];
				continue;
			}

			value = element.style[key] || cStyle[key] || 0;

			if (_containsCSSFunc.test(value)) {
				value = Animator.parseTransformString(value);
			}

			from[key] = value;
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
