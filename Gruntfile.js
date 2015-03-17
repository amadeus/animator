// jshint node:true
module.exports = function(grunt){ 'use strict';

grunt.loadNpmTasks('grunt-contrib-connect');
grunt.loadNpmTasks('grunt-contrib-uglify');

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
	},

	uglify: {
		standard: {
			options: {
				mangle: {
					toplevel: true
				},
				compress: {
					sequences : true,
					dead_code : true,
					unused    : true,
					join_vars : true,
					unsafe    : true,
					loops     : true,
					booleans  : true
				},
				report: 'gzip',
				comments: false
			},
			files: {
				'dist/Animator.min.js': ['src/Animator.js']
			}
		}
	}

});

grunt.registerTask('serve', 'connect:serve');

grunt.registerTask('default', [
	'serve'
]);

};
