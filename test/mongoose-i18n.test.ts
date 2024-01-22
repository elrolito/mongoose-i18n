import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { describe } from "mocha";
import mongoose, { Model, Schema } from "mongoose";
import Q from "q";

// import i18n from "../src/mongoose-i18n";
const i18n = require("../src/mongoose-i18n");

const debug = require("debug")("mongoose-i18n:test");

chai.use(chaiAsPromised);
const expect = chai.expect;

const ValidationError = mongoose.Error.ValidationError;

describe("Translatable", () => {
  let Translatable: Model<any> | undefined = undefined;

  before(() => {
    mongoose.connect("mongodb://localhost/test-mongoose-i18n");
    mongoose.connection.on("connected", () =>
      console.log("Connected to MongoDB")
    );
    mongoose.connection.on("error", (err) => {
      console.log(`MongoDB error: ${err.message}`);
      console.log("Make sure MongoDB is up and running.");
    });
  });

  after(() => {
    mongoose.connection.dropDatabase();
  });

  describe("Schema", () => {
    it("should throw error if no languages is passed in the configuration", () => {
      const TranslatableSchema = new Schema({
        index: Number,
        value: { type: String, i18n: true },
      });
      expect(() => TranslatableSchema.plugin(i18n)).to.throw(
        TypeError,
        /must pass an array of languages/i
      );
    });

    it("should throw error if languages passed in the configuration isn't an array", () => {
      const TranslatableSchema = new Schema({
        index: Number,
        value: { type: String, i18n: true },
      });
      expect(() =>
        TranslatableSchema.plugin(i18n, { languages: "en_US es_ES fr_FR" })
      ).to.throw(TypeError, /must pass an array of languages/i);
    });

    describe("with required option set", () => {
      describe("and default language set", () => {
        before(() => {
          const TranslatableSchema = new Schema({
            index: Number,
            value: { type: String, i18n: true, required: true },
          });
          TranslatableSchema.plugin(i18n, {
            languages: ["en_US", "es_ES", "fr_FR"],
            defaultLanguage: "en_US",
          });
          Translatable = mongoose.model("Translatable_0_0", TranslatableSchema);
        });

        it("should require the default language only", async (done) => {
          expect(Translatable).not.to.be.undefined;
          if (!Translatable) throw new Error("Translatable is undefined!");
          let p = new Translatable({ value: { en_US: "Hello" } }).validate();
          expect(p).to.be.fulfilled;
          p = new Translatable({
            value: { es_ES: "Hola", fr_FR: "Bonjour", zh_HK: "你好" },
          }).validate();
          expect(p).to.be.rejectedWith(ValidationError, /en_US/i);
          expect(p).to.be.rejectedWith(ValidationError, /required/i);
          done();
        });
      });

      describe("and default language absent", () => {
        before(() => {
          const TranslatableSchema = new Schema({
            index: Number,
            value: { type: String, i18n: true, required: true },
          });

          TranslatableSchema.plugin(i18n, {
            languages: ["en_US", "es_ES", "fr_FR"],
          });
          Translatable = mongoose.model("Translatable_0_1", TranslatableSchema);
        });

        it("should require all languages to be set", (done) => {
          // Todo: use the promise version of `validate()` once mongoose 3.9 is stable
          expect(Translatable).not.to.be.undefined;
          if (!Translatable) throw new Error("Translatable is undefined!");

          let p = new Translatable({ value: { en_US: "Hello" } }).validate();
          expect(p).to.be.rejectedWith(ValidationError, /required/i);
          expect(p).to.be.rejectedWith(ValidationError, /es_ES/i);
          expect(p).to.be.rejectedWith(ValidationError, /fr_FR/i);

          p = new Translatable({
            value: {
              en_US: "Hello",
              es_ES: "Hola",
              fr_FR: "Bonjour",
              zh_HK: "你好",
            },
          }).validate();
          expect(p).to.be.fulfilled;
          done();
        });
      });
    });
  });

  describe("Instance", () => {
    before(() => {
      const TranslatableSchema = new Schema({
        index: Number,
        value: { type: String, i18n: true },
        value2: { type: String, i18n: true },
      });

      TranslatableSchema.plugin(i18n, {
        languages: ["en_US", "es_ES", "fr_FR"],
        defaultLanguage: "en_US",
      });
      Translatable = mongoose.model("Translatable_1_0", TranslatableSchema);
    });

    it("should store i18n fields in registered languages", (done) => {
      expect(Translatable).not.to.be.undefined;
      if (!Translatable) throw new Error("Translatable is undefined!");
      let p = Translatable.create({
        index: 0,
        value: {
          en_US: "Hello",
          es_ES: "Hola",
          fr_FR: "Bonjour",
          zh_HK: "你好",
        },
        value2: {
          en_US: "Bye",
          es_ES: "Adiós",
          fr_FR: "Au revoir",
          zh_HK: "再見",
        },
      });
      expect(p).to.be.fulfilled;
      p.then((translatable) => {
        expect(translatable)
          .to.have.deep.nested.property("value.en_US")
          .that.equals("Hello");
        expect(translatable)
          .to.have.deep.nested.property("value.es_ES")
          .that.equals("Hola");
        expect(translatable)
          .to.have.deep.nested.property("value.fr_FR")
          .that.equals("Bonjour");
        expect(translatable).to.not.have.deep.nested.property("value.zh_HK");
        expect(translatable)
          .to.have.deep.nested.property("value2.en_US")
          .that.equals("Bye");
        expect(translatable)
          .to.have.deep.nested.property("value2.es_ES")
          .that.equals("Adiós");
        expect(translatable)
          .to.have.deep.nested.property("value2.fr_FR")
          .that.equals("Au revoir");
        expect(translatable).to.not.have.deep.nested.property("value2.zh_HK");
        done();
      });
    });

    it("should have virtual getter and setter for the default language", (done) => {
      expect(Translatable).not.to.be.undefined;
      if (!Translatable) throw new Error("Translatable is undefined!");
      let p = Translatable.findOne({ index: 0 }).exec();
      expect(p).to.be.fulfilled;
      p.then((translatable) => {
        expect(translatable.value).has.property("i18n").that.equals("Hello");
        expect(translatable.value2).has.property("i18n").that.equals("Bye");

        translatable.value.i18n = "Hi";
        translatable.value2.i18n = "Farewell";

        Q.ninvoke(translatable, "save").then(() => {
          if (!Translatable) throw new Error("Translatable is undefined!");
          return Translatable.findOne({ index: 0 }).exec();
        });
        return translatable;
      }).then((translatable) => {
        expect(translatable)
          .to.have.deep.nested.property("value.en_US")
          .that.equals("Hi");
        expect(translatable)
          .to.have.deep.nested.property("value2.en_US")
          .that.equals("Farewell");
        done();
      });
    });

    describe("toObjectTranslated(), toJSONTranslated()", () => {
      before((done) => {
        const TranslatableSchema = new Schema({
          index: Number,
          value: { type: String, i18n: true },
          value2: { type: String, i18n: true },
          child: {
            type: Schema.Types.ObjectId,
            ref: "Translatable_2_0",
          },
        });

        TranslatableSchema.plugin(i18n, {
          languages: ["en_US", "es_ES", "fr_FR"],
          // defaultLanguage: "en_US",
        });

        Translatable = mongoose.model("Translatable_2_0", TranslatableSchema);

        const p = Translatable.create({
          index: 0,
          value: { en_US: "Morning", es_ES: "Mañana", fr_FR: "Matin" },
        });
        expect(p).to.be.fulfilled;
        p.then((translatable) => {
          if (!Translatable) throw new Error("Translatable is undefined!");
          Translatable.create({
            index: 1,
            value: { en_US: "Hello", es_ES: "Hola", fr_FR: "Bonjour" },
            value2: { en_US: "Bye", es_ES: "Adiós", fr_FR: "Au revoir" },
            child: translatable._id,
          });
          done();
        });
      });

      it("should respond to `toObjectTranslated()`", () => {
        expect(Translatable).not.to.be.undefined;
        if (!Translatable) throw new Error("Translatable is undefined!");
        expect(
          Translatable.findOne({ index: 1 }).exec()
        ).to.eventually.respondTo("toObjectTranslated");
      });

      it("should respond to `toJSONTranslated()`", () => {
        expect(Translatable).not.to.be.undefined;
        if (!Translatable) throw new Error("Translatable is undefined!");
        expect(
          Translatable.findOne({ index: 1 }).exec()
        ).to.eventually.respondTo("toJSONTranslated");
      });

      it("should act the same as `toObject()` and `toJSON()` without `translation` passed", (done) => {
        expect(Translatable).not.to.be.undefined;
        if (!Translatable) throw new Error("Translatable is undefined!");
        let p = Translatable.findOne({ index: 1 }).exec();
        expect(p).to.be.fulfilled;
        p.then((translatable) => {
          const object = translatable.toObjectTranslated();
          expect(object)
            .to.have.deep.nested.property("value.en_US")
            .that.equals("Hello");
          expect(object)
            .to.have.deep.nested.property("value.es_ES")
            .that.equals("Hola");
          expect(object)
            .to.have.deep.nested.property("value.fr_FR")
            .that.equals("Bonjour");
          expect(object)
            .to.have.deep.nested.property("value2.en_US")
            .that.equals("Bye");
          expect(object)
            .to.have.deep.nested.property("value2.es_ES")
            .that.equals("Adiós");
          expect(object)
            .to.have.deep.nested.property("value2.fr_FR")
            .that.equals("Au revoir");

          const json = translatable.toJSONTranslated();
          expect(object)
            .to.have.deep.nested.property("value.en_US")
            .that.equals("Hello");
          expect(object)
            .to.have.deep.nested.property("value.es_ES")
            .that.equals("Hola");
          expect(object)
            .to.have.deep.nested.property("value.fr_FR")
            .that.equals("Bonjour");
          expect(object)
            .to.have.deep.nested.property("value2.en_US")
            .that.equals("Bye");
          expect(object)
            .to.have.deep.nested.property("value2.es_ES")
            .that.equals("Adiós");
          expect(object)
            .to.have.deep.nested.property("value2.fr_FR")
            .that.equals("Au revoir");
          done();
        });
      });

      it("should accept an option `language` and translate all the i18n fields", (done) => {
        expect(Translatable).not.to.be.undefined;
        if (!Translatable) throw new Error("Translatable is undefined!");
        let p = Translatable.findOne({ index: 1 }).exec();
        expect(p).to.be.fulfilled;
        p.then((translatable) => {
          const object = translatable.toObjectTranslated({ language: "es_ES" });
          expect(object).to.have.property("value").that.equals("Hola");
          expect(object).to.have.property("value2").that.equals("Adiós");

          const json = translatable.toJSONTranslated({ language: "fr_FR" });
          expect(json).to.have.property("value").that.equals("Bonjour");
          expect(json).to.have.property("value2").that.equals("Au revoir");
          done();
        });
      });

      it("should work with `populate`", (done) => {
        expect(Translatable).not.to.be.undefined;
        if (!Translatable) throw new Error("Translatable is undefined!");
        Translatable.findOne({ index: 1 })
          .populate("child")
          .exec()
          .then((translatable) => {
            const object = translatable.toObjectTranslated({
              language: "es_ES",
            });
            expect(object).to.have.property("value").that.equals("Hola");
            expect(object).to.have.property("value2").that.equals("Adiós");
            expect(object)
              .to.have.deep.nested.property("child.value")
              .that.equals("Mañana");

            const json = translatable.toJSONTranslated({
              language: "fr_FR",
            });
            expect(json).to.have.property("value").that.equals("Bonjour");
            expect(json).to.have.property("value2").that.equals("Au revoir");
            expect(json.child).to.have.property("value").that.equals("Matin");
            done();
          });
      });

      describe("With array of embedded documents", () => {
        before((done) => {
          const TranslatableSchema = new Schema({
            index: Number,
            value: { type: String, i18n: true },
            value2: { type: String, i18n: true },
            children: [
              {
                type: Schema.Types.ObjectId,
                ref: "Translatable_2_1",
              },
            ],
          });

          TranslatableSchema.plugin(i18n, {
            languages: ["en_US", "es_ES", "fr_FR"],
            defaultLanguage: "en_US",
          });

          Translatable = mongoose.model("Translatable_2_1", TranslatableSchema);

          let p = Q.all([
            Translatable.create({
              index: 0,
              value: { en_US: "Morning", es_ES: "Mañana", fr_FR: "Matin" },
            }),
            Translatable.create({
              index: 1,
              value: {
                en_US: "Good night",
                es_ES: "Buenas noches",
                fr_FR: "Bonne nuit",
              },
            }),
          ]);
          expect(p).to.be.fulfilled;
          p.spread((translatable1, translatable2) => {
            expect(Translatable).not.to.be.undefined;
            if (!Translatable) throw new Error("Translatable is undefined!");
            Translatable.create({
              index: 2,
              value: { en_US: "Hello", es_ES: "Hola", fr_FR: "Bonjour" },
              value2: { en_US: "Bye", es_ES: "Adiós", fr_FR: "Au revoir" },
              children: [translatable1._id, translatable2._id],
            }).then(() => done());
          });
        });

        it("should still work with `populate`", (done) => {
          expect(Translatable).not.to.be.undefined;
          if (!Translatable) throw new Error("Translatable is undefined!");
          const p = Translatable.findOne({ index: 2 })
            .populate("children")
            .exec();
          expect(p).to.be.fulfilled;
          p.then((translatable) => {
            const object = translatable.toObjectTranslated({
              language: "es_ES",
            });
            expect(object).to.have.property("value").that.equals("Hola");
            expect(object).to.have.property("value2").that.equals("Adiós");
            expect(object)
              .to.have.deep.property("children")
              .that.is.an("Array")
              .and.have.a.lengthOf(2);
            expect(object.children[0])
              .to.have.property("value")
              .that.equals("Mañana");
            expect(object.children[1])
              .to.have.property("value")
              .that.equals("Buenas noches");

            const json = translatable.toJSONTranslated({
              language: "fr_FR",
            });
            expect(json).to.have.property("value").that.equals("Bonjour");
            expect(json).to.have.property("value2").that.equals("Au revoir");
            expect(json)
              .to.have.deep.property("children")
              .that.is.an("Array")
              .and.have.a.lengthOf(2);
            expect(json.children[0])
              .to.have.property("value")
              .that.equals("Matin");
            expect(json.children[1])
              .to.have.property("value")
              .that.equals("Bonne nuit");
            done();
          });
        });
      });
    });
  });
});
