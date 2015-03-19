(function(){

var element = document.getElementById('spring');

var animator = new Animator();

var coords = {
	x: 0,
	y: 0
};

animator.springElement(element, {
	stiffness : 70,
	friction  : 10,
	threshold : 0.03,
	target: coords,
	style: {
		transform: {
			translate3d: ['[x]px', '[y]px', '0px']
		}
	}
});

document.body.addEventListener('mousemove', function(event){
	// console.log(event);
	coords.x = event.clientX;
	coords.y = event.clientY;
}, false);

})();
