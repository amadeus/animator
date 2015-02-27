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

var Keyframes = [
	{
		element: 'form',
		duration: 2000,

		keyframes: {
			0: {
				opacity: 0,
				top: 0,
				_topUnit: '%',
				transform: {
					translate3d: [0,-100, 1]
				},
				_timing: Animator.TWEENS.EASE_OUT_SINE,
			},
			40: {
				opacity: 1,
				top: 58,
				_topUnit: '%',
				transform: {
					translate3d: [0,20,0]
				},
				_timing: Animator.TWEENS.EASE_IN_OUT_SINE,
				_callback: function(){} // do something at this point in the animation
			},
			70: {
				opacity: 1,
				top: 47,
				_topUnit: '%',
				transform: {
					translate3d: [0,-10,0]
				},
				_timing: Animator.TWEENS.EASE_IN_OUT_SINE,
			},
			100: {
				opacity: 1,
				top: 50,
				_topUnit: '%',
				transform: {
					translate3d: [0,0,0]
				}
			}
		}
	}
];

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
	.addKeyframes('popin', Keyframes[0].keyframes)
	.animate('animate', 'popin', 300);
