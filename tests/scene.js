(function(){

var coords = {
	x: window.innerWidth / 2,
	y: window.innerHeight / 2
};

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
		start: 400,
		queue: [
			{
				element: 'block',
				duration: 300,
				animation: 'popin'
			}, {
				scene: 'pulse-scene'
			}
		]
	}, {
		start: 400,
		queue: {
			element: 'block',
			duration:300,
			from: {
				opacity: 0
			},
			to: {
				opacity: 1
			}
		}
	}, {
		start: 0,
		queue: [
			{
				duration: 700,
				_finished: function(){
					document.body.addEventListener('mousemove', function(event){
						coords.x = event.clientX;
						coords.y = event.clientY;
					}, false);
				}
			}, {
				element: 'spring',
				spring: {
					stiffness : 200,
					friction : 15,
					threshold : 0.1,
					target: coords,
					permanent: true,
					styles: {
						transform: {
							translate3d: ['{x}px', '{y}px', '0px']
						}
					}
				}
			}
		]
	}
];

var pulseScene = [
	{
		start: 0,
		queue: [
			{
				element: 'block',
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
				element: 'block',
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
