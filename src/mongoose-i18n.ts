// Mongoose i18n Plugin
// ==============================================================================

// Mongoose plugin based off of a couple gists I found while trying to support
// i18n schemas.
//
// @author Rolando Henry <elrolito@me.com>
// @see https://gist.github.com/viczam/3306456d3c63e2c21f1d
// @see https://gist.github.com/hetsch/3925111

import { Document, Schema, ToObjectOptions, VirtualType } from "mongoose";

// const debug = require("debug")("mongoose-i18n");

// The plugin
//
// @example using the plugin
//   mongoose = require 'mongoose'
//   i18nPlugin = require 'mongoose-i18n'
//   (... define your schema, e.g. MySchema ...)
//   MySchema.plugin i18nPlugin, languages: ['en', 'fr'], defaultLanguage: 'en'
//
// @param {Object} schema
// @param {Object} options plugin options
// @option options {Array} languages array of expected languages
// @option options {String} [defaultLanguage] the default language
// @throws {TypeError} if languages is not set or is not an array

export interface I18nMethods<T> {
  toObjectTranslated(opts?: ToObjectOptions & { language?: string }): T;
  toJSONTranslated(opts?: ToObjectOptions & { language?: string }): T;
}

type PluginOptions = {
  languages: string[];
  defaultLanguage?: string;
};

const plugin = function (schema: Schema, options: PluginOptions) {
  if (!Array.isArray(options?.languages)) {
    throw new TypeError("Must pass an array of languages.");
  }

  schema.eachPath((path, config) => {
    // process if i18n: true
    if (config.options.i18n) {
      // remove from options
      // delete config.options.i18n;

      // no longer need this path in schema
      // removePathFromSchema(path, schema);
      schema.remove(path);

      // add path to schema for each language
      options.languages.forEach((lang) => {
        // use same config for each language
        const obj = { [lang]: { ...config.options } };
        // delete obj[lang]["i18n"];

        if (config.options.required) {
          // if set, only require the default language
          if (options.defaultLanguage && lang !== options.defaultLanguage) {
            delete obj[lang]["required"];
          }
        }

        // add the new path to the schema
        schema.add(obj, `${path}.`);
      });

      if (options.defaultLanguage) {
        const vPath = `${path}.i18n`;
        const defaultPath = `${path}.${options.defaultLanguage}`;

        schema
          .virtual(vPath)
          .get(function (this) {
            return this.get(defaultPath);
          })
          .set(function (this, value: any) {
            return this.set(defaultPath, value);
          });
      }
    }
  });

  schema.methods.toObjectTranslated = function (
    opts?: ToObjectOptions & { language?: string }
  ) {
    const thisDoc = this as Document;
    let language: string | undefined = undefined;

    if (opts) {
      language = opts.language;
      delete opts.language;

      // The native Document.prototype.toObject doesn't like an empty object
      // `{}` as the parameter
      if (!Object.keys(opts).length) {
        opts = undefined;
      }
    }

    if (!language && options.defaultLanguage) {
      language = options.defaultLanguage;
    }

    // const ret = Document.prototype.toObject.call(this, opts);
    const ret = this.toObject(opts);

    if (language) {
      translateObject(ret, schema, language, options.defaultLanguage);

      // translate every populated children objects too
      // for key, populated of this.$__.populated
      //   populated.options.model?.schema? and translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage)
      Object.entries((this.$__.populated as object) || {}).forEach(
        ([key, populated]) => {
          if (populated.options.model?.schema) {
            translateObject(
              ret[key],
              populated.options.model.schema,
              language || "",
              options.defaultLanguage
            );
          }
        }
      );
    }

    return ret;
  };

  schema.methods.toJSONTranslated = function (
    opts?: ToObjectOptions & { language?: string }
  ) {
    let language: string | undefined = undefined;

    if (opts) {
      language = opts.language;
      delete opts.language;

      // The native Document.prototype.toJSON doesn't like an empty object
      // `{}` as the parameter
      if (!Object.keys(opts).length) {
        opts = undefined;
      }
    }

    if (!language && options.defaultLanguage) {
      language = options.defaultLanguage;
    }

    // const ret = Document.prototype.toJSON.call(this, opts);
    const ret = this.toJSON(opts);

    if (language) {
      translateObject(ret, schema, language, options.defaultLanguage);

      // translate every populated children objects too
      // for key, populated of this.$__.populated
      //   translateObject(ret[key], populated.options.model.schema, language, options.defaultLanguage)
      Object.entries((this.$__.populated as object) || {}).forEach(
        ([key, populated]) => {
          translateObject(
            ret[key],
            populated.options.model.schema,
            language || "",
            options.defaultLanguage
          );
        }
      );
    }

    return ret;
  };
};

// Translate an object's fields that has `i18n` enabled
//
// @param {Object} object the object returned from `Document.toObject()` or
//                        `Document.toJSON()`
// @param {Mongoose.Schema} schema the schema of `object`
// @param {String} language
// @param {String} defaultLanguage
const translateObject = (
  obj: any,
  schema: Schema,
  language: string,
  defaultLanguage?: string
) => {
  let lastTranslatedField = "";

  schema.eachPath((path, config) => {
    if (
      config.options.i18n &&
      !new RegExp(`^${lastTranslatedField}\\.[^.]+?$`).test(path)
    ) {
      lastTranslatedField = path.replace(/^(.*?)\.([^\.]+?)$/, "$1");

      let tree: any = obj;
      const keys = path.split(".");
      let key: string | undefined;
      while (keys.length > 2 && (key = keys.shift()) !== undefined) {
        tree = tree[key];
      }

      if (Array.isArray(tree)) {
        tree.forEach((child, index) => {
          translateScalar(tree[index], keys[0], language, defaultLanguage);
        });
      } else {
        translateScalar(tree, keys[0], language, defaultLanguage);
      }
    }
  });
};

const translateScalar = (
  tree: any,
  key: string,
  language: string,
  defaultLanguage?: string
) => {
  const item = tree[key];
  if (item === undefined) {
    tree[key] = "";
  } else if (item[language]) {
    tree[key] = item[language];
  } else if (defaultLanguage && item[defaultLanguage]) {
    tree[key] = item[defaultLanguage];
  } else if (tree) {
    tree[key] = "";
  }
};

// Add remove method to Schema prototype
//
// @param {String} path path to be removed from schema
// const removePathFromSchema = (path: string, schema: Schema) => {
//   schema.remove(path)
//   const keys = path.split(".");
//   let tree: any = schema.obj;
//   let key: string | undefined;
//   while (keys.length > 1 && (key = keys.shift()) !== undefined) {
//     tree = tree[key];
//   }
//   key = keys.shift();
//   if (key !== undefined) {
//     delete tree[key];
//   }
//   delete schema.paths[path];
// };

module.exports = plugin;

export default plugin;
