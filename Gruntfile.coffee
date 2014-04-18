exports = module.exports = (grunt) ->
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'default', ['coffee']

  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')

    coffee:
      compile:
        files: [
          expand: true
          cwd: 'src/'
          src: ['**/*.coffee']
          dest: 'lib/'
          ext: '.js'
        ]

    watch:
      source:
        files: ['**/*.coffee']
        tasks: ['coffee']
        options:
          cwd: 'src/'