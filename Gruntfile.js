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
					sequences    : true,  // join consecutive statemets with the “comma operator”
					dead_code    : true,  // discard unreachable code
					unused       : true,  // drop unused variables/functions
					join_vars    : true,  // join var declarations
					unsafe       : true,  // some unsafe optimizations (see below)
					loops        : true,  // optimize loops
					booleans     : true,  // optimize boolean expressions
					properties   : true,  // optimize property access                             : a["foo"] → a.foo
					conditionals : true,  // optimize if-s and conditional expressions
					comparisons  : true,  // optimize comparisons
					evaluate     : true,  // evaluate constant expressions
					hoist_funs   : true,  // hoist function declarations
					hoist_vars   : true,  // hoist variable declarations
					if_return    : true,  // optimize if-s followed by return/continue
					cascade      : true,  // try to cascade `right` into `left` in sequences
					side_effects : true,  // drop side-effect-free statements
					warnings     : true   // warn about potentially dangerous optimizations/code
				},
				report: 'gzip',
				comments: false
			},
			files: {
				'dist/animator.min.js': ['src/animator.js']
			}
		}
	}

});

grunt.registerTask('serve', 'connect:serve');

grunt.registerTask('default', [
	'serve'
]);

};
