var src = 'public/';
var dest = 'dist/';

var scripts = [
	'public/js/app.js',
	'public/js/controllers.js',
	'public/js/filters.js',
	'public/js/directives.js',
	'public/js/services.js',
	'public/js/ga.js'
];

var vendor = [
	'dist/js/lib/jquery-2.2.4.min.js',
	'dist/js/lib/bootstrap.min.js',
	'dist/js/lib/angular.min.js',
	'dist/js/lib/ngDialog.min.js',
	'dist/js/lib/angular-route.min.js',
	'dist/js/lib/angular-tablesort.js',
	'dist/js/lib/lodash.min.js',
	'dist/js/lib/moment.min.js',
	'dist/js/lib/moment.en.min.js',
	'dist/js/lib/toastr.min.js',
	'dist/js/lib/angular-tooltips.min.js',
	'node_modules/particles.js/particles.js',
	'dist/js/lib/chartjs.min.js',
	'dist/js/lib/dt-hamburger-menu.js',
	'dist/js/lib/primus.js'
];

var styles = [
	'bootstrap.min.css',
	'toastr.min.css',
	'ngDialog.min.css',
	'angular-tooltips.min.css',
	'style.css',
	'dt-hamburger-menu.css',
	'minimal-icons-embedded.css'
];

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: {
			build: ['dist'],
			cleanup_js: ['dist/js/*.*', '!dist/js/cnexplorer.*'],
			cleanup_css: ['dist/css/*.css', '!dist/css/cnexplorer.*.css']
		},
		pug: {
			build: {
				options: {
					data: {
						debug: false,
						pretty: true
					}
				},
				files: {
					'dist/index.html': 'public/views/index.pug'
				}
			}
		},
		copy: {
			build: {
				files: [
					{
						expand: true,
						cwd: 'public/fonts/',
						src: ['*.*'],
						dest: 'dist/fonts/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'public/images/',
						src: ['*.*'],
						dest: 'dist/images/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'public/images/',
						src: ['*.ico'],
						dest: 'dist/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'public/images/',
						src: ['cnexplorer-*.png'],
						dest: 'dist/images/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'public/css/',
						src: styles,
						dest: 'dist/css/',
						filter: 'isFile'
					},
					{
						expand: true,
						cwd: 'public/js/lib/',
						src: ['*.*'],
						dest: 'dist/js/lib'
					},
					{
						expand: true,
						cwd: 'public/templates/',
						src: ['*.*'],
						dest: 'dist/templates/'
					}
				]
			}
		},
		cssmin: {
			build: {
				files: [{
					expand: true,
					cwd: 'dist/css',
					src: ['*.css', '!*.min.css'],
					dest: 'dist/css/'
				}]
			}
		},
		concat: {
			vendor: {
				options: {
					sourceMap: true,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/js/lib/*.map']
				},
				src: vendor,
				dest: 'dist/js/vendor.min.js'
			},
			scripts : {
				options: {
					separator: ';\n',
				},
				src: scripts,
				dest: 'dist/js/app.js'
			},
			cnexplorer: {
				options: {
					sourceMap: true,
					sourceMapIncludeSources: true,
					sourceMapIn: ['dist/js/vendor.min.js.map', 'dist/js/app.min.js.map']
				},
				src: ['<%= concat.vendor.dest %>', '<%= uglify.app.dest %>'],
				dest: 'dist/js/cnexplorer.min.js',
				nonull: true,
			},
			css: {
				src: ['dist/css/*.min.css', 'dist/css/*.css'],
				dest: 'dist/css/cnexplorer.min.css'
			}
		},
		uglify: {
			app: {
				options: {
					mangle: false,
					sourceMap: true,
					sourceMapIncludeSources: true
				},
				dest: 'dist/js/app.min.js',
				src: ['<%= concat.scripts.dest %>']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-pug');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['clean:build', 'clean:cleanup_js', 'clean:cleanup_css', 'pug:build', 'copy:build', 'cssmin:build', 'concat:vendor', 'concat:scripts', 'uglify:app', 'concat:cnexplorer', 'concat:css', 'clean:cleanup_js', 'clean:cleanup_css']);
	grunt.registerTask('build',   'default');
};
