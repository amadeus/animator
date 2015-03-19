(function(){

var element = document.getElementById('spring');

var animator = new Animator();

var coords = {
	x: window.innerWidth / 2,
	y: window.innerHeight / 2
};

var stiffness = document.getElementById('stiffness');
var friction  = document.getElementById('friction');

var buttonEnable  = document.getElementById('enable-spring');
var buttonDisable = document.getElementById('disable-spring');

var setSpring = function(){
	var stiff = parseFloat(stiffness.value || 0, 10);
	var fric = parseFloat(friction.value || 0, 10);
	if (isNaN(stiff) || isNaN(fric)) {
		return;
	}
	animator.springElement(element, {
		stiffness : stiff,
		friction : fric,
		threshold : 0.03,
		target: coords,
		style: {
			transform: {
				translate3d: ['{x}px', '{y}px', '0px']
			}
		}
	});
};

var disableSpring = function(){
	animator.removeSpring(element);
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

buttonDisable.addEventListener('click', disableSpring, false);
buttonEnable.addEventListener('click', setSpring, false);

})();
