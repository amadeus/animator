// jshint ignore: start
var Tween = {
	element: 'form',
	tween: [
		{
			duration: 2000,
			callback: function(){
				// these values have been reached
			},
			timing: 'ease-in-out',

			top: 20,
			transform: {
				translate3d: [0,0,0],
				scale: [0,0]
			}
		}
	]
};

var Animations = {
	SlideIn: {
		0: {
			opacity: 0,
			transform: {
				translate3d: [0,500, 0]
			},
			_timing: Animator.TWEENS.EASE_OUT_SINE,
		},
		40: {
			opacity: 1,
			transform: {
				translate3d: [0,-60,0]
			},
			_timing: Animator.TWEENS.EASE_OUT_SINE,
			_callback: function(){} // do something at this point in the animation
		},
		70: {
			transform: {
				translate3d: [0,20,0]
			},
			_timing: Animator.TWEENS.EASE_OUT_SINE,
		},
		100: {
			transform: {
				translate3d: [0,0,0]
			}
		}
	}
};

var Spring = {
	element: 'form',
	spring: {
		stiffness : 70,
		friction  : 10,
		threshold : 0.03,
		callback: function(){}, // rando callback... wuuuut
		target: {}
	}
};

var animator = new Animator(),
	form = document.getElementById('form'),
	select = document.getElementById('animations'),
	duration = document.getElementById('duration'),
	option;

for (var name in Animations) {
	animator.addKeyframes(name, Animations[name]);
	option = document.createElement('option');
	option.innerHTML = name;
	option.value = name;
	select.appendChild(option);
}

form.addEventListener('submit', function(event){
	event.preventDefault();
	var dur = parseFloat(duration.value);
	if (!dur) {
		dur = duration.value = 600;
	}
	animator.animate(
		'animate',
		select.value,
		dur
	);
}, false);
