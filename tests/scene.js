(function(){

var scene = [
	{
		start: 0,
		queue: [
			{
				element: 'first',
				duration: 1000,
				from: {
					transform: {
						translate3d: [0, 0, 0]
					},
					_timing: 'ease-in-out'
				},
				to: {
					transform: {
						translate3d: [0, 200, 0]
					}
				}
			}, {
				element: 'second',
				duration: 500,
				from: {
					transform: {
						translate3d: [0, 0, 0]
					}
				},
				to: {
					transform: {
						translate3d: [300, 300, 0]
					},
					_timing: 'ease-in-out'
				}
			}
		]
	}, {
		start: 400,
		queue: [
			{
				scene: 'block-scene2'
			}
		]
	},
	{
		start: 400,
		queue: [
			{
				element: 'third',
				duration: 1000,
				to: {
					transform: {
						translate3d: [100, 0, 0]
					},
					_timing: 'ease-in-out'
				}
			}
		]
	}, {
		start: 0,
		queue: {
			element: document.body,
			duration: 1000,
			from: {
				backgroundColor: {
					rgb: [255, 255, 255]
				},
				_timing: 'ease-in-out'
			},
			to: {
				backgroundColor: {
					rgb: [100, 100, 100]
				}
			}
		}
	}
];

var scene2 = {
	start: 0,
	queue: [
		{
			element: document.body,
			duration: 500,
			to: {
				transform: {
					scale: [0.5, 0.5],
				},
				_timing: 'ease-in'
			}
		}, {
			element: document.body,
			duration: 500,
			to: {
				transform: {
					scale: [1, 1],
				},
				_timing: 'ease-out'
			}
		}
	]
};

Animator.createScene('block-scene', scene);
Animator.createScene('block-scene2', scene2);
Animator.runScene('block-scene');

})();
