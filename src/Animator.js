(function(global){

var Animator, _typeOf, _toStringRegex, _isElementRegex, _requestAnimationFrame, _performance, _nowOffset;

_toStringRegex  = /(\[object\ |\])/g;
_isElementRegex = /html[\w]*element/;

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

Animator = function(){
	this._animations = {};
	this._springs    = {};
};

Animator.prototype = {
	isRunning: false,

	createAnimation: function(name, keyframes){
	},

	creatSpring: function(name, physics){
	}
};

global.Animator = Animator;

})(this);
