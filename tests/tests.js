// jshint unused:false
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
				transform: {
					translate3d: [0,-100, 1]
				},
				timing: 'ease-out'
			},
			40: {
				opacity: 1,
				transform: {
					translate3d: [0,20,0]
				},
				timing: 'ease-in-out',
				callback: function(){} // do something at this point in the animation
			},
			70: {
				opacity: 1,
				transform: {
					translate3d: [0,-10,0]
				},
				timing: 'ease-in-out',
			},
			100: {
				opacity: 1,
				transform: {
					translate3d: [0,0,0]
				},
				timing: 'ease-in-out'
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

// var manager = new Animator();
// manager.animate()
