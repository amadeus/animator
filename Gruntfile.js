// jshint node:true
module.exports = function(grunt){ 'use strict';

grunt.loadNpmTasks('grunt-contrib-connect');

grunt.initConfig({

	connect: {
		serve: {
			options: {
				port: 5000,
				keepalive: true,
				open: {
					target: 'http://localhost:5000/tests',
					appName: 'Google Chrome'
				}
			}
		}
	}

});

grunt.registerTask('serve', 'connect:serve');

grunt.registerTask('default', [
	'serve'
]);

};
