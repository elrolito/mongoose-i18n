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
        translateObject(ret, schema, language);
        _ref = this.$__.populated;
        for (key in _ref) {
          populated = _ref[key];
          translateObject(ret[key], populated.options.model.schema, language);
        }
      }
      return ret;
    };
  };

  translateObject = function(object, schema, language, defaultLanguage) {
    var lastTranslatedField;
    lastTranslatedField = '';
    return schema.eachPath(function(path, config) {
      var child, index, keys, tree, _i, _len, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _results;
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
            if ((_ref = tree[index][keys[0]]) != null ? _ref[language] : void 0) {
              _results.push(tree[index][keys[0]] = (_ref1 = tree[index][keys[0]]) != null ? _ref1[language] : void 0);
            } else if (defaultLanguage && ((_ref2 = tree[index][keys[0]]) != null ? _ref2[defaultLanguage] : void 0)) {
              _results.push(tree[index][keys[0]] = (_ref3 = tree[index][keys[0]]) != null ? _ref3[defaultLanguage] : void 0);
            } else {
              _results.push(void 0);
            }
          }
          return _results;
        } else {
          if ((_ref4 = tree[keys[0]]) != null ? _ref4[language] : void 0) {
            return tree[keys[0]] = (_ref5 = tree[keys[0]]) != null ? _ref5[language] : void 0;
          } else if (defaultLanguage && ((_ref6 = tree[keys[0]]) != null ? _ref6[defaultLanguage] : void 0)) {
            return tree[keys[0]] = (_ref7 = tree[keys[0]]) != null ? _ref7[defaultLanguage] : void 0;
          }
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
