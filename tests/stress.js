(function(){

var _requestAnimationFrame =
	window.requestAnimationFrame       ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	function(callback){
		window.setTimeout(callback, 1000 / 60);
	};

var counter = 0;
var counterEl = document.getElementById('counter');

var randomInt = function(min, max){
	return Math.floor(Math.random() * (max - min) + min);
};

var elementPool = [];

var getElementFromPool = function(duration){
	var el;

	if (elementPool.length) {
		el = elementPool.shift();
		resetElement(el, duration);
		return el;
	}

	el = document.createElement('div');
	el.className = 'box';

	resetElement(el, duration);

	document.body.appendChild(el);

	return el;
};

var resetElement = function(el, duration) {
	el.style.backgroundColor = 'rgb(' +
		randomInt(0, 255) + ',' +
		randomInt(0, 255) + ',' +
		randomInt(0, 255) + ')';

	var left = randomInt(-10, window.innerWidth);
	var scale = 1 - (duration - 1000) / 2000;
	el.style.left = left + 'px';
	el.style.opacity = 1;
	el.style.width =  (10 * scale) + 'px';
	el.style.height = (10 * scale) + 'px';
	el.style[Animator.findPrefix('transform')] = 'translate3d(0,-20px,0)';
};

var poolElement = function(el){
	elementPool.push(el);
};

var removeNode = function(tween){
	poolElement(tween.element);
	counter--;
};

var createBlock = function(){
	var duration = randomInt(1000, 3000);
	var el = getElementFromPool(duration);

	Animator.tweenElement(el, duration, {
		opacity: 0,
		transform: {
			translate3d: [0, (window.innerHeight + 20), 0]
		},

		_timing: 'ease-in'
	}, removeNode);

	counter++;
};

var func = function(){
	for (var x = 0; x < 3; x++) {
		createBlock();
	}

	counterEl.innerHTML = counter + ' simultaneous tweens';

	_requestAnimationFrame(func);
};

func();

})();
