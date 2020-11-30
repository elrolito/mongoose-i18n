// Mongoose i18n Plugin
// ==============================================================================

// Mongoose plugin based off of a couple gists I found while trying to support
// i18n schemas.

// @author Rolando Henry <elrolito@me.com>
// @see https://gist.github.com/viczam/3306456d3c63e2c21f1d
// @see https://gist.github.com/hetsch/3925111
'use strict';
var Document, _, debug, exports, mongoose, removePathFromSchema, translateObject;

_ = require('lodash');

debug = require('debug')('mongoose-i18n');

mongoose = require('mongoose');

Document = mongoose.Document;

// The plugin

// @example using the plugin
//   mongoose = require 'mongoose'
//   i18nPlugin = require 'mongoose-i18n'
//   (... define your schema, e.g. MySchema ...)
//   MySchema.plugin i18nPlugin, languages: ['en', 'fr'], defaultLanguage: 'en'

// @param {Object} schema
// @param {Object} options plugin options
// @option options {Array} languages array of expected languages
// @option options {String} [defaultLanguage] the default language
// @throws {TypeError} if languages is not set or is not an array
exports = module.exports = function(schema, options) {
  if (!_.isArray(options != null ? options.languages : void 0)) {
    throw new TypeError('Must pass an array of languages.');
  }
  schema.eachPath(function(path, config) {
    var defaultPath, vPath;
    // process if i18n: true
    if (config.options.i18n) {
      // remove from options
      // delete config.options.i18n

      // no longer need this path in schema
      removePathFromSchema(path, schema);
      // add path to schema for each language
      _.each(options.languages, function(lang) {
        var obj;
        obj = {};
        // use same config for each language
        obj[lang] = Object.assign({}, config.options);
        if (config.options.required) {
          // if set, only require the default language
          if ((options.defaultLanguage != null) && lang !== options.defaultLanguage) {
            delete obj[lang]['required'];
          }
        }
        // add the new path to the schema
        return schema.add(obj, `${path}.`);
      });
      if (options.defaultLanguage != null) {
        vPath = `${path}.i18n`;
        defaultPath = `${path}.${options.defaultLanguage}`;
        // virtual getter for default language
        schema.virtual(vPath).get(function() {
          return this.get(defaultPath);
        });
        // virtual setter for default language
        return schema.virtual(vPath).set(function(value) {
          return this.set(defaultPath, value);
        });
      }
    }
  });
  schema.methods.toObjectTranslated = function(opts) {
    var key, language, populated, ref, ref1, ret;
    language = void 0;
    if (opts != null) {
      language = opts.language;
      delete opts.language;
      // The native Document.prototype.toObject doesn't like an empty object
      // `{}` as the parameter
      if (Object.keys(opts).length === 0) {
        opts = void 0;
      }
    }
    if (!language && options.defaultLanguage) {
      language = options.defaultLanguage;
    }
    ret = Document.prototype.toObject.call(this, opts);
    if (language != null) {
      translateObject(ret, schema, language, options.defaultLanguage);
      ref = this.$__.populated;
      // translate every populated children objects too
      for (key in ref) {
        populated = ref[key];
        (((ref1 = populated.options.model) != null ? ref1.schema : void 0) != null) && translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage);
      }
    }
    return ret;
  };
  return schema.methods.toJSONTranslated = function(opts) {
    var key, language, populated, ref, ret;
    language = void 0;
    if (opts != null) {
      language = opts.language;
      delete opts.language;
      // The native Document.prototype.toJSON doesn't like an empty object
      // `{}` as the parameter
      if (Object.keys(opts).length === 0) {
        opts = void 0;
      }
    }
    if (!language && options.defaultLanguage) {
      language = options.defaultLanguage;
    }
    ret = Document.prototype.toJSON.call(this, opts);
    if (language != null) {
      translateObject(ret, schema, language, options.defaultLanguage);
      ref = this.$__.populated;
      // translate every populated children objects too
      for (key in ref) {
        populated = ref[key];
        translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage);
      }
    }
    return ret;
  };
};

// Translate an object's fields that has `i18n` enabled

// @param {Object} object the object returned from `Document.toObject()` or
//                        `Document.toJSON()`
// @param {Mongoose.Schema} schema the schema of `object`
// @param {String} language
// @param {String} defaultLanguage
translateObject = function(object, schema, language, defaultLanguage) {
  var lastTranslatedField;
  lastTranslatedField = '';
  return schema.eachPath(function(path, config) {
    var child, i, index, keys, len, results, translateScalar, tree;
    if (config.options.i18n && !new RegExp(`^${lastTranslatedField}\\.[^\.]+?$`).test(path)) {
      lastTranslatedField = path.replace(/^(.*?)\.([^\.]+?)$/, '$1');
      keys = path.split('.');
      tree = object;
      while (keys.length > 2) {
        tree = tree[keys.shift()];
      }
      translateScalar = function(tree, key, language, defaultLanguage) {
        var ref, ref1, ref2, ref3;
        if (tree != null ? (ref = tree[key]) != null ? ref[language] : void 0 : void 0) {
          return tree[key] = (ref1 = tree[key]) != null ? ref1[language] : void 0;
        } else if (defaultLanguage && (tree != null ? (ref2 = tree[key]) != null ? ref2[defaultLanguage] : void 0 : void 0)) {
          return tree[key] = (ref3 = tree[key]) != null ? ref3[defaultLanguage] : void 0;
        } else if (tree) {
          return tree[key] = "";
        }
      };
      if (_.isArray(tree)) {
        results = [];
        for (index = i = 0, len = tree.length; i < len; index = ++i) {
          child = tree[index];
          results.push(translateScalar(tree[index], keys[0], language, defaultLanguage));
        }
        return results;
      } else {
        return translateScalar(tree, keys[0], language, defaultLanguage);
      }
    }
  });
};

// Add remove method to Schema prototype

// @param {String} path path to be removed from schema
removePathFromSchema = function(path, schema) {
  var keys, tree;
  keys = path.split('.');
  tree = schema.tree;
  while (keys.length > 1) {
    tree = tree[keys.shift()];
  }
  delete tree[keys.shift()];
  return delete schema.paths[path];
};
