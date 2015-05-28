/* global module, define */
(function(root, factory) {
	if (typeof exports === 'object') {
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		define(
			'animator',
			[],
			factory
		);
	} else {
		root.Animator = factory();
	}
})(this, function() { 'use strict';

var Animator, REGEX, updateTween, updateDelay, updateSpring, updateScene, Internal, _typeOf,
	_requestAnimationFrame, _performance, _nowOffset, _dateNow, _getComputedStyle,
	_toCamelCase, _has3d;

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
	defaultPixel     : /(translate|top|left|bottom|right|height|width|margin|padding|border)/,
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

updateDelay = function(tick){
	if (this.delta === undefined) {
		this.delta = 0;
	} else {
		this.delta += tick;
	}

	if (this.delta >= this.duration) {
		return true;
	} else {
		return false;
	}
};

updateTween = function(tick){
	var delta, prop, timing, from, to, duration, element;

	element = this.element;

	if (this.delta === undefined) {
		this.delta = 0;
	} else {
		this.delta += tick;
	}

	delta    = this.delta;
	from     = this.from;
	to       = this.to;
	duration = this.duration;

	timing = this.from._timing || Animator.TWEENS.LINEAR;

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
};

updateSpring = function(tick){
	var name, styles, element, isFinished;

	element    = this.element;
	styles     = this.styles;
	tick       = tick / 1000;

	for (name in styles) {
		element.style[name] = Internal.getSpringStyle(
			styles[name],
			this,
			tick
		);
	}

	isFinished = true;
	for (name in this.target) {
		if (this.complete[name] !== true) {
			isFinished = false;
		}
	}

	return isFinished;
};

updateScene = function(tick){
	var x, queue;
	if (this.delta === undefined) {
		this.delta = 0;
	} else {
		this.delta += tick;
	}

	// First determine if any scenes need to be added to running
	for (x = 0; x < this.queues.length;) {
		if (this.queues[x].start <= this.delta) {
			queue = this.queues.splice(x, 1)[0].queue;
			Internal.generateFromTweens(queue[0]);
			this.running.push(queue);
		} else {
			x += 1;
		}
	}

	Internal.iterate(this.running, tick);

	if (this.running.length) {
		return false;
	} else {
		return true;
	}
};

Internal = {

	isRunning: false,

	_index: 0,
	_last: undefined,

	animating : [],

	addQueue: function(queue){
		if (
			this.animating.indexOf(queue) >= 0 ||
			!queue.length
		) {
			return;
		}

		Internal.generateFromTweens(queue[0]);
		this.animating.push(queue);
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
		var now, tick;

		if (window.stats) {
			window.stats.begin();
		}

		now = _performance.now();

		if (Internal._last === undefined) {
			Internal._last = now;
		}

		tick = now - Internal._last;
		if (Internal.clamp) {
			tick = Math.min(tick, Internal.clamp);
		}

		Internal.iterate(Internal.animating, tick);

		if (window.stats) {
			window.stats.end();
		}

		if (!Internal.animating.length) {
			Internal.isRunning = false;
			Internal._last = undefined;
			return;
		}

		Internal._last = now;
		_requestAnimationFrame(Internal.run);
	},

	iterate: function(queues, tick){
		var a, anim, done;

		for (a = 0; a < queues.length;) {
			anim = queues[a][0];
			done = undefined;

			if (!anim) {
				queues.splice(a, 1);
				continue;
			}

			if (anim.paused) {
				a += 1;
				continue;
			}

			done = anim.update(tick);

			if (done && !anim.permanent) {
				if (anim.to) {
					if (anim.to._onFrame) {
						anim.to._onFrame(anim);
					}
					if (anim.to._finished) {
						anim.to._finished(anim);
					}
				}
				if (anim._onFrame) {
					anim._onFrame(anim);
				}
				if (anim._finished) {
					anim._finished(anim);
				}
				queues[a].splice(0, 1);
				if (queues[a].length) {
					Internal.generateFromTweens(queues[a][0]);
				}
				continue;
			}
			a += 1;
		}

		anim  = undefined;

	},

	generateFromTweens: function(anim){
		if (!anim) {
			return;
		}

		if (anim && anim.type === 'tween' && !anim.from) {
			anim.from = Internal.getFromTween(anim.element, anim.to);
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

	getSpringStyle: function(items, spring, tick, separator){
		var value = '', name, x, key, accel, vel, current, target, complete;

		target   = spring.target;
		current  = spring.current;
		vel      = spring.vel;
		accel    = spring.accel;
		complete = spring.complete;

		if (items.length) {
			for (x = 0; x < items.length; x += 2) {
				value += ' ';
				if (x > 0 && separator) {
					value += separator;
				}
				if (typeof current[items[x]] !== 'undefined') {
					key = items[x];

					accel[key] = spring.stiffness * (target[key] - current[key]) - spring.friction * vel[key];
					if (Math.abs(accel[key]) < spring.threshold) {
						accel[key] = 0;
						vel[key] = 0;
						current[key] = target[key];
						if (complete[key] === false) {
							complete[key] = true;
						}
					} else if (current[key] !== target[key]){
						vel[key]     += accel[key] * tick;
						current[key] += vel[key] * tick;
						complete[key] = false;
					}
					value += current[key];
				} else {
					value +=  items[x];
				}
				if (items[x + 1]) {
					value += items[x + 1];
				}
			}
		} else {
			for (name in items) {
				value += name + '(';
				value += Internal.getSpringStyle(items[name], spring, tick, ',');
				value += ') ';
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

			// Automatically convert translate3d to translate[2d] on browsers
			// that do not support 3d
			if (key === 'translate3d' && !_has3d) {
				key = 'translate';
				value.pop();
				value.pop();
			}

			newObject[key] = value;
		}

		return newObject;
	},

	keyframesToTweens: function(animation, duration, element, finished){
		var queue = [],
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
				update   : updateTween,
				element  : element,
				from     : from,
				to       : to,
				duration : ((duration * toPercent) - (duration * fromPercent)) >> 0
			};

			queue.push(tween);

			from = to;
			fromPercent = toPercent;
		}

		if (_typeOf(finished) === 'function') {
			queue[queue.length - 1].to._finished = finished;
		}

		to   = undefined;
		from = undefined;
		fromPercent = undefined;
		toPercent   = undefined;

		return queue;
	},

	getValueAndUnits: function(itemsRef, prop){
		var items, value, unit, x, match;

		if (REGEX.startsWith.test(prop)) {
			return itemsRef;
		}

		if (
			_typeOf(itemsRef) !== 'number' &&
			_typeOf(itemsRef) !== 'string' &&
			_typeOf(itemsRef) !== 'array'
		) {
			return itemsRef;
		}

		if (_typeOf(itemsRef) === 'string') {
			items = itemsRef.split(' ');
		} else if (_typeOf(itemsRef) !== 'array') {
			items = [itemsRef];
		} else {
			items = [];
			for (x = 0; x < itemsRef.length; x++) {
				items[x] = itemsRef[x];
			}
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
			cStyle, key, value;

		for (key in to) {
			if (REGEX.startsWith.test(key)) {
				from[key] = to[key];
				continue;
			}

			value = element.style[key];
			if (!value) {
				// We should ONLY grab computed style if necessary.
				if (!cStyle) {
					 cStyle = _getComputedStyle(element);
				}
				value = cStyle[key] || 0;
			}

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

	setupSpring: function(element, reference, queue){
		var name, previousSettings, x, settings;

		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (_typeOf(reference) !== 'object') {
			throw new TypeError(
				'Animator - Internal.setupSpring: spring settings must be an object: ' + reference
			);
		}

		if (queue) {
			for (x = 0; x < queue.length; x++) {
				if (
					queue[x].type === 'spring' &&
					queue[x].element === element
				) {
					previousSettings = queue[x];
					break;
				}
			}
		}

		// If there is a spring already set on the current element, update its
		// values, I probably need to do more about templating though.
		if (previousSettings) {
			previousSettings.threshold  = reference.threshold;
			previousSettings.stiffness  = reference.stiffness;
			previousSettings.friction   = reference.friction;
			previousSettings.permanent  = reference.permanent;
			previousSettings._finished  = reference._finished;
			return;
		}

		settings = {
			type      : 'spring',
			update    : updateSpring,
			_finished : reference._finished,

			target    : reference.target,
			stiffness : reference.stiffness,
			friction  : reference.friction,
			threshold : reference.threshold,
			permanent : reference.permanent,
			complete  : {},
			current   : {},
			vel       : {},
			accel     : {}
		};

		if (reference.styles) {
			settings.styles = Internal.convertObject(reference.styles);
		}

		for (name in reference.target) {
			settings.current[name] = (reference.start) ? reference.start[name] : reference.target[name];
			settings.vel[name]     = (reference.vel) ? reference.vel[name] : 0;
			settings.accel[name]   = 0;
		}

		settings.element = element;

		if (!previousSettings && queue) {
			queue.push(settings);
		}

		return settings;
	},

	setupDelay: function(duration, callback){
		var delay = {
			type      : 'delay',
			update    : updateDelay,
			duration  : parseInt(duration, 10) || 0,
			_finished : callback
		};
		return delay;
	},

	setupTween: function(element, duration){
		var from, to, tween, frames, callback;

		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}
		if (_typeOf(element) !== 'element') {
			throw new TypeError(
				'Animator - Internal.setupTween: Must provide a valid element to tween: ' + element
			);
		}
		if (_typeOf(duration) !== 'number') {
			throw new TypeError(
				'Animator - Internal.setupTween: Must provide a valid duration: ' + duration
			);
		}

		frames = Array.prototype.slice.call(arguments, 2);

		if (_typeOf(frames[frames.length - 1]) === 'function') {
			callback = frames.pop();
		}

		if (frames.length >= 2) {
			from = Internal.convertFrame(frames[0]);
			to   = Internal.convertFrame(frames[1], from);
			if (to._timing) {
				from._timing = to._timing;
			}
		} else {
			to = Internal.convertFrame(frames[0]);
		}

		tween = {
			type     : 'tween',
			update   : updateTween,
			element  : element,
			duration : duration,
			from     : from,
			to       : to
		};

		if (callback) {
			tween.to._finished = callback;
		}

		return tween;
	},

	setupAnimation: function(element, animation, duration, finished){
		if (_typeOf(element) === 'string') {
			element = document.getElementById(element);
		}

		if (_typeOf(element) !== 'element') {
			throw new TypeError(
				'Animator - Internal.setupAnimation: Must provide a valid element to animate: ' + element
			);
		}

		duration = duration || 1000;

		if (!Animator.Animations[animation]) {
			throw new Error(
				'Animator - Internal.setupAnimation: Animation does not exist: ' + animation
			);
		}

		var anim = Internal.keyframesToTweens(
			Animator.Animations[animation],
			duration,
			element,
			finished
		);

		return anim;
	},

	setupMethod: function(method, finished){
		return {
			update    : method,
			_finished : finished
		};
	},

	setupScene: function(sceneSettings, finished){
		var scene, itemRef, item, anim, animRef, x, y;

		if (_typeOf(sceneSettings) === 'string') {
			sceneSettings = Animator.Scenes[sceneSettings];
		}

		if (_typeOf(sceneSettings) !== 'array') {
			throw new TypeError(
				'Animator - Internal.setupScene: Not valid scene - ' + sceneSettings
			);
		}

		scene = {
			type    : 'scene',
			update  : updateScene,
			queues  : [],
			running : [],
			_finished: finished
		};

		for (x = 0; x < sceneSettings.length; x++) {
			itemRef = sceneSettings[x];

			if (!itemRef || !itemRef.queue) {
				throw new Error(
					'Animator - Internal.setupScene: Invalid item - ' + itemRef
				);
			}
			if (_typeOf(itemRef.queue) !== 'array') {
				itemRef.queue = [itemRef.queue];
			}
			if (!itemRef.start) {
				itemRef.start = 0;
			}
			item = {
				start: itemRef.start,
				queue: []
			};
			for (y = 0; y < itemRef.queue.length; y++) {
				anim = undefined;
				animRef = itemRef.queue[y];

				if (!animRef.element && animRef.duration) {
					anim = Internal.setupDelay(
						animRef.duration,
						animRef._finished
					);
				} else if (animRef.element && animRef.to) {
					anim = Internal.setupTweenFromObject(animRef);
				} else if (animRef.element && animRef.animation) {
					anim = Internal.setupAnimation(
						animRef.element,
						animRef.animation,
						animRef.duration,
						animRef._finished
					);
				} else if (animRef.element && animRef.spring) {
					anim = Internal.setupSpring(
						animRef.element,
						animRef.spring
					);
				} else if (animRef.update) {
					anim = Internal.setupMethod(animRef.update, animRef._finished);
				} else if (animRef.scene) {
					anim = Internal.setupScene(animRef.scene);
				}

				if (!anim) {
					continue;
				}
				if (_typeOf(anim) === 'array') {
					item.queue.push.apply(item.queue, anim);
				} else {
					item.queue.push(anim);
				}
			}
			if (item.queue.length) {
				scene.queues.push(item);
			}
		}

		return scene;
	},

	setupTweenFromObject: function(obj){
		var args = [obj.element, obj.duration];

		if (obj.from) {
			args.push(obj.from);
		}
		args.push(obj.to);
		if (args._finished) {
			args.push(obj._finished);
		}
		return Internal.setupTween.apply(Internal, args);
	}

};

Animator = {

	Animations: {},
	Scenes: {},

	setClamp: function(clamp){
		if (_typeOf(clamp) !== 'number') {
			throw new TypeError('Animator.setClamp: Clamp must be a number: ' + clamp);
		}
		if (clamp <= 16 && clamp !== 0) {
			throw new Error('Animator.setClamp: Clamp must be greater than 16 or 0: ' + clamp);
		}
		Internal.clamp = clamp;
		return this;
	},

	runScene: function(scene, finished) {
		var queue = new Animator.Queue();
		queue.addScene(scene, finished);
		return queue.start();
	},

	springElement: function(){
		var queue = new Animator.Queue();
		queue.addSpring.apply(queue, arguments);
		return queue.start();
	},

	tweenElement: function(){
		var queue = new Animator.Queue();
		queue.addTween.apply(queue, arguments);
		return queue.start();
	},

	animateElement: function(){
		var queue = new Animator.Queue();
		queue.addAnimation.apply(queue, arguments);
		return queue.start();
	},

	createAnimation: function(name, keyframes){
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

		Animator.Animations[name] = keyframes;

		return this;
	},

	createScene: function(name, scene){
		if (_typeOf(name) !== 'string') {
			return this;
		}
		if (_typeOf(scene) === 'object') {
			scene = [scene];
		}
		if (_typeOf(scene) !== 'array') {
			return this;
		}
		Animator.Scenes[name] = scene;
		return this;
	},

	parseCSSFunctionString: function(string){
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
	},

	// Find the appropriate vendored prefix for the given
	// css prop. The non-prefixed prop will ALWAYS be preferred
	// If nothing can be found, the original prop is returned.
	findPrefix: function(prop){
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
	},

	TWEENS: {

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
	}

};

// CSS Animation shortcuts...
Animator.TWEENS.EASE_IN     = Animator.TWEENS.EASE_IN_SINE;
Animator.TWEENS.EASE_OUT    = Animator.TWEENS.EASE_OUT_SINE;
Animator.TWEENS.EASE_IN_OUT = Animator.TWEENS.EASE_IN_OUT_SINE;

Animator.Queue = function(){
	this._queue = [];
};

Animator.Queue.prototype = {

	isRunning: function(){
		var index = Internal.animating.indexOf(this._queue);
		if (index >= 0) {
			return true;
		} else {
			return false;
		}
	},

	addScene: function(id, finished){
		var scene = Internal.setupScene(id, finished);
		this._queue.push(scene);
		return this;
	},

	addMethod: function(method, finished){
		var obj = Internal.setupMethod(method, finished);
		this._queue.push(obj);
		return this;
	},

	addDelay: function(duration, callback){
		var delay = Internal.setupDelay(duration, callback);
		this._queue.push(delay);
		return this;
	},

	addSpring: function(element, settings){
		// Springs are a bit funny - since we allow them to be changed
		// inline, we don't duplicate the format of the other functions
		Internal.setupSpring(element, settings, this._queue);
		return this;
	},

	addTween: function(){
		var tween = Internal.setupTween.apply(Internal, arguments);
		this._queue.push(tween);
		return this;
	},

	addAnimation: function(element, animation, duration, finished){
		var anim = Internal.setupAnimation(element, animation, duration, finished);
		this._queue.push.apply(this._queue, anim);
		return this;
	},

	start: function(){
		if (this.isRunning() || !this._queue.length) {
			return this;
		}

		Internal.addQueue(this._queue);
		return this;
	},

	stop: function(){
		this.clearQueue();
		return this;
	},

	pause: function(){
		if (!this._queue.length) {
			return this;
		}
		this._queue[0].paused = true;
		this.paused = true;
		return this;
	},

	resume: function(){
		if (!this._queue.length) {
			return this;
		}
		this._queue[0].paused = false;
		this.paused = false;
		return this;
	},

	clearCurrent: function(){
		this._queue.shift();
		return this;
	},

	clearQueue: function(){
		this._queue.length = 0;
		return this;
	},

	getCurrentAnimation: function(){
		if (!this._queue.length) {
			return null;
		}
		return this._queue[0];
	}

};

// Determine transform3d support
_has3d = (function(){
	var el = document.createElement('div'),
		transform = Animator.findPrefix('transform'),
		style;

	el.style.position   = 'absolute';
	el.style[transform] = 'translate3d(1px,1px,1px)';

	document.body.appendChild(el);
	style = _getComputedStyle(el)[transform] || '';
	document.body.removeChild(el);

	if (style.match(/matrix3d/)) {
		return true;
	}

	return false;
})();

return Animator;

});
