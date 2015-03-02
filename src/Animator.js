(function(global){

var Animator, Internal, _typeOf, _toStringRegex, _isElementRegex,
	_requestAnimationFrame, _performance, _nowOffset, _startsWithRegex, _unitRegex;

_toStringRegex  = /(\[object\ |\])/g;
_isElementRegex = /html[\w]*element/;
_startsWithRegex = /^_/;
_unitRegex = /^[-0-9]+/;

// Simple typeOf checker
_typeOf = function(toTest){
	var type;

	type = Object.prototype.toString.call(toTest)
		.replace(_toStringRegex, '')
		.toLowerCase();

	if (type.match(_isElementRegex)) {
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


// Simple window.performance polyfill
_performance = global.performance || {};

if (!_performance.now) {
	_nowOffset = Date.now();

	if (
		_performance.timing &&
		_performance.timing.navigationStart
	) {
		_nowOffset = _performance.timing.navigationStart;
	}

	_performance.now = function now(){
		return Date.now() - _nowOffset;
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

Internal = {

	isRunning: false,

	_index: 0,

	elements  : {},
	animating : [],

	add: function(anim){
		this.animations.push();
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
			toRemove = [],
			a, len, anims, now, done, index;

		if (Internal.isRunning) {
			_requestAnimationFrame(Internal.run);
		} else {
			return;
		}

		now = _performance.now();

		for (a = 0, len = animating.length; a < len; a++) {
			anims = Internal.elements[animating[a]];
			if (anims[0].type === 'tween' && !anims[0].paused) {
				done = Internal.updateTween(anims.element, anims[0], now);
				if (done) {
					anims.shift();
				}

				if (done && !anims.length) {
					toRemove.push(animating[a]);
				}
			}
		}

		if (toRemove.length) {
			for (a = 0, len = toRemove.length; a < len; a++) {
				Internal.elements[toRemove[a]] = undefined;
				index = animating.indexOf(toRemove[a]);
				if (index >= 0) {
					animating.splice(index, 1);
				}
			}
		}
	},

	updateTween: function(element, tween, now){
		var delta, prop, timing, value;

		if (!tween.start) {
			tween.start = now;
		}

		delta = now - tween.start;

		if (tween.delay && tween.delay > delta) {
			return;
		}

		if (tween.delay) {
			delta -= tween.delay;
		}

		timing = tween.from._timing || Animator.TWEENS.LINEAR;

		for (prop in tween.from) {
			if (prop.match(_startsWithRegex)) {
				continue;
			}

			value = timing(
				delta,
				tween.from[prop][0],
				tween.to[prop][0] - tween.from[prop][0],
				tween.duration
			);

			element.style[prop] = value + (tween.from[prop][1] || '');
		}

		if (delta > tween.duration) {
			return true;
		} else {
			return false;
		}
	},

	updateSpring: function(element, spring){
	}
};

Animator = function(){
	this._animations = {};
};

Animator.prototype = {
	animate: function(element, animation, duration){
		var id, tweens;

		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (_typeOf(element) !== 'element') {
			throw new Error('Animator.animate: Must provide a valid element to animate: ' + element);
		}

		duration = duration || 1000;

		id = 'anim' + Internal._index++;

		tweens = [];

		this.keyframesToTweens(
			this._animations[animation],
			duration,
			tweens
		);

		tweens.element = element;
		Internal.elements[id] = tweens;
		Internal.animating.push(id);
		Internal.start();
	},

	keyframesToTweens: function(animation, duration, tweens){
		var from, to, fromPercent, toPercent, percent, tween;

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
	},

	convertFrame: function(frame){
		var key, value, unit;

		if (_typeOf(frame) !== 'object') {
			return frame;
		}

		for (key in frame) {
			if (!frame.hasOwnProperty(key)) {
				continue;
			}
			value = parseFloat(frame[key]);
			if (isNaN(value)) {
				continue;
			}
			if (_typeOf(frame[key]) === 'string') {
				unit = frame[key].replace(_unitRegex, '');
			}
			frame[key] = [value];
			if (unit) {
				frame[key][1] = unit;
			}
			unit = undefined;
		}

		return frame;
	},

	addKeyframes: function(name, keyframes){
		var frame;

		if (
			_typeOf(name)      !== 'string' ||
			_typeOf(keyframes) !== 'object'
		) {
			return this;
		}

		for (frame in keyframes) {
			keyframes[frame] = this.convertFrame(keyframes[frame]);
		}

		this._animations[name] = keyframes;

		return this;
	},

	addSpring: function(name, physics){
		return this;
	}
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

global.Animator = Animator;

})(this);
