// jshint ignore:start
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

var animator = new Animator();

var createBlock = function(){
	var el = document.createElement('div');
	el.className = 'box';
	el.style.backgroundColor = 'rgb(' +
		randomInt(0, 255) + ',' +
		randomInt(0, 255) + ',' +
		randomInt(0, 255) + ')';

	var left = randomInt(-10, window.innerWidth);
	var duration = randomInt(500, 2000);
	var scale = 1 - (duration - 500) / 1500;
	el.style.left = left + 'px';
	// el.style.width =  (10 * scale) + 'px';
	// el.style.height = (10 * scale) + 'px';
	el.style[Animator.findPrefix('transform')] = 'translate3d(0,-10px,0)';

	document.body.appendChild(el);

	animator.tweenElement(el, duration, {
		// top: window.innerHeight - 100,
		transform: {
			translate3d: [0, (window.innerHeight + 20), 0]
		},
		_callback: function(){
			el.parentNode.removeChild(el);
			el = null;
			counter--;
		}
	});

	counter++;
};

var func = function(){
	for (var x = 0; x < 8; x++) {
		createBlock();
	}

	counterEl.innerHTML = counter + ' sprites';

	_requestAnimationFrame(func);
};

func();

})();
