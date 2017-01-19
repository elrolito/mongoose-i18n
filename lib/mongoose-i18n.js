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
    schema.methods.toObjectTranslated = function(opts) {
      var key, language, populated, ret, _ref;
      language = void 0;
      if (opts != null) {
        language = opts.language;
        delete opts.language;
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
        _ref = this.$__.populated;
        for (key in _ref) {
          populated = _ref[key];
          translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage);
        }
      }
      return ret;
    };
    return schema.methods.toJSONTranslated = function(opts) {
      var key, language, populated, ret, _ref;
      language = void 0;
      if (opts != null) {
        language = opts.language;
        delete opts.language;
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
        _ref = this.$__.populated;
        for (key in _ref) {
          populated = _ref[key];
          translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage);
        }
      }
      return ret;
    };
  };

  translateObject = function(object, schema, language, defaultLanguage) {
    var lastTranslatedField;
    lastTranslatedField = '';
    return schema.eachPath(function(path, config) {
      var child, index, keys, translateScalar, tree, _i, _len, _results;
      if (config.options.i18n && !new RegExp("^" + lastTranslatedField + "\\.[^\.]+?$").test(path)) {
        lastTranslatedField = path.replace(/^(.*?)\.([^\.]+?)$/, '$1');
        keys = path.split('.');
        tree = object;
        while (keys.length > 2) {
          tree = tree[keys.shift()];
        }
        translateScalar = function(tree, key, language, defaultLanguage) {
          var _ref, _ref1, _ref2, _ref3;
          if (tree != null ? (_ref = tree[key]) != null ? _ref[language] : void 0 : void 0) {
            return tree[key] = (_ref1 = tree[key]) != null ? _ref1[language] : void 0;
          } else if (defaultLanguage && (tree != null ? (_ref2 = tree[key]) != null ? _ref2[defaultLanguage] : void 0 : void 0)) {
            return tree[key] = (_ref3 = tree[key]) != null ? _ref3[defaultLanguage] : void 0;
          } else if (tree) {
            return tree[key] = "";
          }
        };
        if (_.isArray(tree)) {
          _results = [];
          for (index = _i = 0, _len = tree.length; _i < _len; index = ++_i) {
            child = tree[index];
            _results.push(translateScalar(tree[index], keys[0], language, defaultLanguage));
          }
          return _results;
        } else {
          return translateScalar(tree, keys[0], language, defaultLanguage);
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
