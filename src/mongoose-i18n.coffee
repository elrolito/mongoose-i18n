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
debug = require('debug')('mongoose-i18n')
mongoose = require 'mongoose'

Document = mongoose.Document

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
  unless _.isArray(options?.languages)
    throw new TypeError 'Must pass an array of languages.'

  schema.eachPath (path, config) ->
    # process if i18n: true
    if config.options.i18n
      # remove from options
      # delete config.options.i18n

      # no longer need this path in schema
      removePathFromSchema path, schema

      # add path to schema for each language
      _.each options.languages, (lang) ->
        obj = {}
        # use same config for each language
        obj[lang] = Object.assign {}, config.options

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

  schema.methods.toObjectTranslated = (opts) ->
      language = undefined

      if opts?
          language = opts.language
          delete opts.language

          # The native Document.prototype.toObject doesn't like an empty object
          # `{}` as the parameter
          if Object.keys(opts).length is 0
              opts = undefined

      if not language and options.defaultLanguage
        language = options.defaultLanguage

      ret = Document.prototype.toObject.call(this, opts)

      if language?
        translateObject(ret, schema, language, options.defaultLanguage)

        # translate every populated children objects too
        for key, populated of this.$__.populated
          populated.options.model?.schema? and translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage)

      return ret

  schema.methods.toJSONTranslated = (opts) ->
      language = undefined

      if opts?
          language = opts.language
          delete opts.language

          # The native Document.prototype.toJSON doesn't like an empty object
          # `{}` as the parameter
          if Object.keys(opts).length is 0
              opts = undefined

      if not language and options.defaultLanguage
        language = options.defaultLanguage

      ret = Document.prototype.toJSON.call(this, opts)

      if language?
        translateObject(ret, schema, language, options.defaultLanguage)

        # translate every populated children objects too
        for key, populated of this.$__.populated
          translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage)

      return ret

# Translate an object's fields that has `i18n` enabled
#
# @param {Object} object the object returned from `Document.toObject()` or
#                        `Document.toJSON()`
# @param {Mongoose.Schema} schema the schema of `object`
# @param {String} language
# @param {String} defaultLanguage
translateObject = (object, schema, language, defaultLanguage) ->
  lastTranslatedField = ''

  schema.eachPath (path, config) ->
    if config.options.i18n and not new RegExp("^#{lastTranslatedField}\\.[^\.]+?$").test(path)

      lastTranslatedField = path.replace(/^(.*?)\.([^\.]+?)$/, '$1')

      keys = path.split '.'
      tree = object

      tree = tree[keys.shift()] while keys.length > 2

      translateScalar = (tree, key, language, defaultLanguage) ->
        if tree?[key]?[language]
          tree[key] = tree[key]?[language]
        else if defaultLanguage and tree?[key]?[defaultLanguage]
          tree[key] = tree[key]?[defaultLanguage]
        else if tree
          tree[key] = ""

      if _.isArray(tree)
        for child, index in tree
          translateScalar tree[index], keys[0], language, defaultLanguage
      else
        translateScalar tree, keys[0], language, defaultLanguage

# Add remove method to Schema prototype
#
# @param {String} path path to be removed from schema
removePathFromSchema = (path, schema) ->
  keys = path.split '.'
  tree = schema.tree
  tree = tree[keys.shift()] while keys.length > 1

  delete tree[keys.shift()]
  delete schema.paths[path]
