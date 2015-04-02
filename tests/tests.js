// jshint ignore: start
(function(){ 'use strict';

var Animations = {
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
				scale: [1.07, 1.07]
			},
			_timing: 'ease-in-out',
			_onFrame: function(){
				console.log('In the middle of the animation');
			}
		},
		65: {
			transform: {
				scale: [0.98, 0.98]
			},
			_timing:'ease-in-out'
		},
		100: {
			transform: {
				scale: [1, 1]
			},
			_onFrame: function(){
				console.log('Animation is done');
			}
		}
	},

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
			_onFrame: function(){} // do something at this point in the animation
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

var animator       = new Animator(),
	form           = document.getElementById('form'),
	select         = document.getElementById('animations'),
	duration       = document.getElementById('duration'),
	durationSlider = document.getElementById('duration-slider'),
	clearQueue     = document.getElementById('clear-trigger'),
	pauseResume    = document.getElementById('pause-trigger'),
	option;

// Create all animations defined in the Animations object above
for (var name in Animations) {
	Animator.addAnimation(name, Animations[name]);
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
	animator.addAnimation(
		'animate',
		select.value,
		dur
	);
}, false);

clearQueue.addEventListener('click', function(event){
	event.preventDefault();
	animator.clearQueue('animate');
	// Clear out all styles from the animation
	var element = document.getElementById('animate');
	element.setAttribute('style', '');
	document.body.className = '';
});

pauseResume.addEventListener('click', function(event){
	event.preventDefault();

	var tween = animator.getCurrentAnimation('animate'),
		element;

	if (!tween) {
		return console.log('No animation in progress to pause or resume');
	}

	element = document.getElementById('animate');
	if (tween.paused) {
		animator.resume();
		document.body.className = '';
	} else {
		animator.pause();
		document.body.className = 'paused';
	}

}, false)

var element = document.getElementById('animate');

element.style.opacity = 0;

setTimeout(function() {
	animator.addTween(element, 500, {
		_timing: 'ease-in-out',
		backgroundColor: {
			rgb: [0, 0, 0]
		},
		opacity: 1,
		transform: {
			scale: 2,
			rotate: '180deg'
		}
	}, function(){
		console.log('Tween finished');
	});

	animator.addTween(element, 700, {
		_timing: 'ease-in-out',
		backgroundColor: {
			rgba: [0, 0, 255, 0.5]
		},
		transform: {
			scale: 1,
			rotate: '0deg'
		}
	});

	animator.addTween(element, 500, {
		_timing: 'ease-in-out',
		opacity: 0.5,
		backgroundColor: {
			rgb: [255, 0, 176]
		},
		transform: {
			translate3d: [0, 200, 0],
			rotate: '0deg',
			scale: 1
		}
	});

	animator.addTween(element, 500, {
		_timing: 'ease-in-out',
		borderRadius: 100
	});

	animator.addTween(element, 500, {
		_timing: 'ease-in-out',
		borderRadius: [0],
		opacity: 1,
		'background-color': {
			rgba: [255,0,0,1]
		},
		transform: {
			translate3d: [0, 0, 0]
		}
	});

}, 500);

})();
