# Mongoose i18n Plugin
# ==============================================================================

# Mongoose plugin based off of a couple gists I found while trying to support
# i18n schemas.
#
# @author Rolando Henry <elrolito@me.com>
# @see https://gist.github.com/viczam/3306456d3c63e2c21f1d
# @see https://gist.github.com/hetsch/3925111

'use strict'

_ = require 'lodash'
mongoose = require 'mongoose'

Schema = mongoose.Schema

# The plugin
#
# @example using the plugin
#   mongoose = require 'mongoose'
#   i18nPlugin = require 'mongoose-i18n'
#   (... define your schema, e.g. MySchema ...)
#   MySchema.plugin i18nPlugin, languages: ['en', 'fr'], defaultLanguage: 'en'
#
# @param {Object} schema
# @param {Object} options plugin options
# @option options {Array} languages array of expected languages
# @option options {String} [defaultLanguage] the default language
# @throws {TypeError} if languages is not set or is not an array
exports = module.exports = (schema, options) ->
  unless options.languages? or _.isArray(options.languages)
    throw new TypeError 'Must pass an array of languages.'

  schema.eachPath (path, config) ->
    # process if i18n: true
    if config.options.i18n
      # remove from options
      delete config.options.i18n

      # no longer need this path in schema
      removePathFromSchema path, schema

      # add path to schema for each language
      _.each options.languages, (lang) ->
        obj = {}
        # use same config for each language
        obj[lang] = config.options

        if config.options.required
          # if set, only require the default language
          if options.defaultLanguage? and lang isnt options.defaultLanguage
            delete obj[lang]['required']

        # add the new path to the schema
        schema.add obj, "#{path}."

      if options.defaultLanguage?
        vPath = "#{path}.i18n"
        defaultPath = "#{path}.#{options.defaultLanguage}"

        # virtual getter for default language
        schema.virtual(vPath).get ->
          return @get defaultPath

        # virtual setter for default language
        schema.virtual(vPath).set (value) ->
          return @set defaultPath, value

# Add remove method to Schema prototype
#
# @param {String} path path to be removed from schema
removePathFromSchema = (path, schema) ->
  keys = path.split '.'
  tree = schema.tree
  tree = tree[keys.shift()] while keys.length > 1

  delete tree[keys.shift()]
  delete schema.paths[path]
