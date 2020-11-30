coffee = require 'gulp-coffee'
gulp = require 'gulp'
log = require 'fancy-log'

gulp.task 'coffee', ->
	gulp
		.src "src/**/*.coffee"
		.pipe coffee({ bare: true }).on('error', log)
		# .pipe concat("coffee.js")
		.pipe gulp.dest("./lib/")

gulp.task "default", gulp.series('coffee')
