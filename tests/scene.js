(function(){

var popin = {
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
		_timing: Animator.TWEENS.EASE_OUT_SINE
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

var scene = [
	{
		start: 0,
		queue: {
			element: document.body,
			duration: 700,
			to: {
				opacity: 1
			}
		}
	}, {
		start: 200,
		queue: [
			{
				element: 'first',
				duration: 300,
				animation: 'popin'
			}, {
				scene: 'pulse-scene'
			}
		]
	}, {
		start: 200,
		queue: {
			element: 'first',
			duration:300,
			from: {
				opacity: 0
			},
			to: {
				opacity: 1
			}
		}
	}
];

var pulseScene = [
	{
		start: 0,
		queue: [
			{
				element: 'first',
				duration: 150,
				from: {
					transform: {
						scale: [1, 1]
					},
					_timing: 'ease-in-out'
				},
				to: {
					transform: {
						scale: [1.1, 1.1]
					}
				}
			}, {
				element: 'first',
				duration: 400,
				from: {
					transform: {
						scale: [1.1, 1.1]
					},
					_timing: 'ease-in-out'
				},
				to: {
					transform: {
						scale: [1, 1]
					},
					_finished: function(){
						Animator.runScene('pulse-scene');
					}
				}
			}
		]
	}
];

Animator.createAnimation('popin', popin);
Animator.createScene('block-scene', scene);
Animator.createScene('pulse-scene', pulseScene);

setTimeout(function() {
	Animator.runScene('block-scene');
}, 500);

})();
