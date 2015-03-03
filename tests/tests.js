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

var SlideIn = {
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

var animator = new Animator();
animator
	.addKeyframes('slide-in', SlideIn)
	.animate('animate', 'slide-in', 600);
