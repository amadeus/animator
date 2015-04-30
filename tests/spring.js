(function(){

var element = document.getElementById('spring');

var queue = new Animator.Queue();

var coords = {
	x: window.innerWidth / 2,
	y: window.innerHeight / 2
};

var stiffness  = document.getElementById('stiffness');
var friction   = document.getElementById('friction');
var permanent = document.getElementById('permanent');

var buttonEnable  = document.getElementById('enable-spring');
var buttonDisable = document.getElementById('disable-spring');

var setSpring = function(){
	var stiff = parseFloat(stiffness.value || 0, 10);
	var fric = parseFloat(friction.value || 0, 10);
	if (isNaN(stiff) || isNaN(fric)) {
		return;
	}
	queue.addSpring(element, {
		stiffness : stiff,
		friction : fric,
		threshold : 0.1,
		target: coords,
		permanent: permanent.checked,
		styles: {
			transform: {
				translate3d: ['{x}px', '{y}px', '0px']
			}
		},
		_finished: function(){
			console.log('The spring has been removed!');
		}
	});
	queue.start();
};

var disableSpring = function(){
	queue.clearCurrent();
};

document.body.addEventListener('mousemove', function(event){
	coords.x = event.clientX;
	coords.y = event.clientY;
}, false);

setSpring();

stiffness.addEventListener('keyup', setSpring, false);
friction.addEventListener( 'keyup', setSpring, false);

stiffness.addEventListener('blur', setSpring, false);
friction.addEventListener( 'blur', setSpring, false);

permanent.addEventListener('change', setSpring, false);

buttonDisable.addEventListener('click', disableSpring, false);
buttonEnable.addEventListener('click', setSpring, false);

})();
