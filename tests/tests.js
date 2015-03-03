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
	},

	PopIn: {
		0: {
			opacity: 0,
			transform: {
				scale: [0, 0],
			},
			_timing: 'ease-out'
		},
		40: {
			opacity: 1,
			transform: {
				scale: [1.05, 1.1]
			},
			_timing: 'ease-in-out',
			_callback: function(){
				console.log('In the middle of the animation');
			}
		},
		70: {
			transform: {
				scale: [0.98, 0.98]
			},
			_timing:'ease-in-out'
		},
		100: {
			transform: {
				scale: [1, 1]
			},
			_callback: function(){
				console.log('Animation is done');
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
	durationSlider = document.getElementById('duration-slider'),
	clearQueue = document.getElementById('clear-trigger'),
	pauseResume = document.getElementById('pause-trigger'),
	option;

for (var name in Animations) {
	animator.addKeyframes(name, Animations[name]);
	option = document.createElement('option');
	option.innerHTML = name;
	option.value = name;
	select.appendChild(option);
}

durationSlider.addEventListener('input', function(){
	duration.value = durationSlider.value;
}, false);

duration.addEventListener('change', function(){
	durationSlider.value = duration.value;
}, false);

form.addEventListener('submit', function(event){
	event.preventDefault();
	var dur = parseFloat(duration.value);
	if (!dur) {
		dur = duration.value = 380;
	}
	animator.startAnimation(
		'animate',
		select.value,
		dur
	);
}, false);

clearQueue.addEventListener('click', function(event){
	event.preventDefault();
	animator.clearTweenQueue('animate');
});

pauseResume.addEventListener('click', function(event){
	event.preventDefault();

	var tween = animator.getCurrentAnimation('animate');

	if (!tween) {
		return console.log('No animation in progress to pause or resume');
	}

	if (tween.paused) {
		animator.resumeAnimation('animate');
	} else {
		animator.pauseAnimation('animate');
	}

}, false)
