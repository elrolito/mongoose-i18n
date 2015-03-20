(function() {
  'use strict';
  var Document, debug, exports, mongoose, removePathFromSchema, translateObject, _;

  _ = require('lodash');

  debug = require('debug')('mongoose-i18n');

  mongoose = require('mongoose');

  Document = mongoose.Document;

  exports = module.exports = function(schema, options) {
    if (!_.isArray(options != null ? options.languages : void 0)) {
      throw new TypeError('Must pass an array of languages.');
    }
    schema.eachPath(function(path, config) {
      var defaultPath, vPath;
      if (config.options.i18n) {
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
    schema.methods.toObjectTranslated = function(options) {
      var key, populated, ret, translation, _ref;
      translation = void 0;
      if (options != null) {
        translation = options.translation;
        delete options.translation;
        if (Object.keys(options).length === 0) {
          options = void 0;
        }
      }
      ret = Document.prototype.toObject.call(this, options);
      if (translation != null) {
        translateObject(ret, schema, translation);
        _ref = this.$__.populated;
        for (key in _ref) {
          populated = _ref[key];
          translateObject(ret[key], populated.options.model.schema, translation);
        }
      }
      return ret;
    };
    return schema.methods.toJSONTranslated = function(options) {
      var key, populated, ret, translation, _ref;
      translation = void 0;
      if (options != null) {
        translation = options.translation;
        delete options.translation;
        if (Object.keys(options).length === 0) {
          options = void 0;
        }
      }
      ret = Document.prototype.toJSON.call(this, options);
      if (translation != null) {
        translateObject(ret, schema, translation);
        _ref = this.$__.populated;
        for (key in _ref) {
          populated = _ref[key];
          translateObject(ret[key], populated.options.model.schema, translation);
        }
      }
      return ret;
    };
  };

  translateObject = function(object, schema, translation) {
    var lastTranslatedField;
    lastTranslatedField = '';
    return schema.eachPath(function(path, config) {
      var child, index, keys, tree, _i, _len, _ref, _ref1, _results;
      if (config.options.i18n && !new RegExp("^" + lastTranslatedField + "\\.[^\.]+?$").test(path)) {
        lastTranslatedField = path.replace(/^(.*?)\.([^\.]+?)$/, '$1');
        keys = path.split('.');
        tree = object;
        while (keys.length > 2) {
          tree = tree[keys.shift()];
        }
        if (_.isArray(tree)) {
          _results = [];
          for (index = _i = 0, _len = tree.length; _i < _len; index = ++_i) {
            child = tree[index];
            _results.push(tree[index][keys[0]] = (_ref = tree[index][keys[0]]) != null ? _ref[translation] : void 0);
          }
          return _results;
        } else {
          return tree[keys[0]] = (_ref1 = tree[keys[0]]) != null ? _ref1[translation] : void 0;
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
