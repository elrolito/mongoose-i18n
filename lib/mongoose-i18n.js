(function() {
  'use strict';
  var Schema, exports, mongoose, removePathFromSchema, _;

  _ = require('lodash');

  mongoose = require('mongoose');

  Schema = mongoose.Schema;

  exports = module.exports = function(schema, options) {
    if (!((options.languages != null) || _.isArray(options.languages))) {
      throw new TypeError('Must pass an array of languages.');
    }
    return schema.eachPath(function(path, config) {
      var defaultPath, vPath;
      if (config.options.i18n) {
        delete config.options.i18n;
        removePathFromSchema(path, schema);
        _.each(options.languages, function(lang) {
          var obj;
          obj = {};
          obj[lang] = config.options;
          if (config.options.required) {
            if ((options.defaultLanguage != null) && lang !== options.defaultLanguage) {
              delete obj[lang]['required'];
            }
          }
          return schema.add(obj, "" + path + ".");
        });
        if (options.defaultLanguage != null) {
          vPath = "" + path + ".i18n";
          defaultPath = "" + path + "." + options.defaultLanguage;
          schema.virtual(vPath).get(function() {
            return this.get(defaultPath);
          });
          return schema.virtual(vPath).set(function(value) {
            return this.set(defaultPath, value);
          });
        }
      }
    });
  };

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

}).call(this);
