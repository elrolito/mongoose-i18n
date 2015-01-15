chai           = require('chai')
chaiAsPromised = require('chai-as-promised')
debug          = require('debug')('mongoose-i18n:test')
mongoose       = require('mongoose')
Q              = require('q')
i18n           = require('../src/mongoose-i18n')

chai.use(chaiAsPromised)
expect = chai.expect

Schema          = mongoose.Schema
ValidationError = mongoose.Error.ValidationError

describe 'Translatable', ->

    Translatable = undefined

    before ->
        mongoose.connect('mongodb://localhost/test-mongoose-i18n')
        mongoose.connection.on 'error', (err) ->
            console.log("MongoDB error: #{ err.message }")
            console.log("Make sure MongoDB is up and running.")

    after ->
        mongoose.connection.db.dropDatabase()

    describe 'Schema', ->

        it 'should throw error if no lanuages is passed in the configuration', ->

            TranslatableSchema = new Schema
                index : Number
                value : { type: String, i18n: true }

            expect(-> TranslatableSchema.plugin(i18n)).to.throw(TypeError, /must pass an array of languages/i)

        it "should throw error if languages passed in the configuration isn't an array", ->

            TranslatableSchema = new Schema
                index : Number
                value : { type: String, i18n: true }

            expect(-> TranslatableSchema.plugin(i18n, { languages: 'en_US es_ES fr_FR' })).to.throw(TypeError, /must pass an array of languages/i)

        describe 'with required option set', ->

            describe 'and default language set', ->

                before ->
                    TranslatableSchema = new Schema
                        index : Number
                        value : { type: String, i18n: true, required: true }

                    TranslatableSchema.plugin(i18n, { languages: ['en_US', 'es_ES', 'fr_FR'], defaultLanguage: 'en_US' })
                    Translatable = mongoose.model('Translatable_0_0', TranslatableSchema)

                it 'should require the default language only', (done) ->

                    # Todo: use the promise version of `validate()` once mongoose 3.9 is stable

                    new Translatable(value: { en_US: 'Hello' }).validate (err) ->
                        expect(err).to.be.undefined

                        new Translatable(value: { es_ES: 'Hola', fr_FR: 'Bonjour', zh_HK: '你好' }).validate (err) ->
                            expect(err).to.be.an.instanceOf(ValidationError)
                                       .and.match(/en_US/i)
                                       .and.match(/required/i)

                            done()

            describe 'and default language absent', ->

                before ->
                    TranslatableSchema = new Schema
                        index : Number
                        value : { type: String, i18n: true, required: true }

                    TranslatableSchema.plugin(i18n, { languages: ['en_US', 'es_ES', 'fr_FR'] })
                    Translatable = mongoose.model('Translatable_0_1', TranslatableSchema)

                it 'should require all languages to be set', (done) ->

                    # Todo: use the promise version of `validate()` once mongoose 3.9 is stable

                    new Translatable(value: { en_US: 'Hello' }).validate (err) ->
                        expect(err).to.be.an.instanceOf(ValidationError)
                                   .and.match(/required/i)
                                   .and.match(/es_ES/i)
                                   .and.match(/fr_FR/i)

                        new Translatable(value: { en_US: 'Hello', es_ES: 'Hola', fr_FR: 'Bonjour', zh_HK: '你好' }).validate (err) ->
                            expect(err).to.be.undefined

                            done()

    describe 'Instance', ->

        before ->
            TranslatableSchema = new Schema
                index  : Number
                value  : { type: String, i18n: true }
                value2 : { type: String, i18n: true }

            TranslatableSchema.plugin(i18n, { languages: ['en_US', 'es_ES', 'fr_FR'], defaultLanguage: 'en_US' })
            Translatable = mongoose.model('Translatable_1_0', TranslatableSchema)

        it 'should store i18n fields in registered languages', ->

            Translatable.create
                index  : 0
                value  : { en_US: 'Hello', es_ES: 'Hola', fr_FR: 'Bonjour', zh_HK: '你好' }
                value2 : { en_US: 'Bye', es_ES: 'Adiós', fr_FR: 'Au revoir', zh_HK: '再見' }
            .then ->
                Translatable.findOne(index: 0).exec()
            .then (translatable) ->
                expect(translatable).to.have.deep.property('value.en_US').that.equals('Hello')
                expect(translatable).to.have.deep.property('value.es_ES').that.equals('Hola')
                expect(translatable).to.have.deep.property('value.fr_FR').that.equals('Bonjour')
                expect(translatable).to.not.have.deep.property('value.zh_HK')
                expect(translatable).to.have.deep.property('value2.en_US').that.equals('Bye')
                expect(translatable).to.have.deep.property('value2.es_ES').that.equals('Adiós')
                expect(translatable).to.have.deep.property('value2.fr_FR').that.equals('Au revoir')
                expect(translatable).to.not.have.deep.property('value2.zh_HK')

        it 'should have virtual getter and setter for the default language', ->
            Translatable.findOne(index: 0).exec()
            .then (translatable) ->
                expect(translatable.value).has.property('i18n').that.equals('Hello')
                expect(translatable.value2).has.property('i18n').that.equals('Bye')

                translatable.value.i18n = 'Hi'
                translatable.value2.i18n = 'Farewell'

                Q.ninvoke(translatable, 'save').then -> Translatable.findOne(index: 0).exec()

            .then (translatable) ->
                expect(translatable).to.have.deep.property('value.en_US').that.equals('Hi')
                expect(translatable).to.have.deep.property('value2.en_US').that.equals('Farewell')

        describe 'toObjectTranslated(), toJSONTranslated()', ->

            before ->
                TranslatableSchema = new Schema
                    index  : Number
                    value  : { type: String, i18n: true }
                    value2 : { type: String, i18n: true }
                    child  :
                        type : Schema.Types.ObjectId
                        ref  : 'Translatable_2_0'

                TranslatableSchema.plugin(i18n, { languages: ['en_US', 'es_ES', 'fr_FR'], defaultLanguage: 'en_US' })

                Translatable = mongoose.model('Translatable_2_0', TranslatableSchema)

                Translatable.create
                    index   : 0
                    value   : { en_US: 'Morning', es_ES: 'Mañana', fr_FR: 'Matin' }
                .then (translatable) ->
                    Translatable.create
                        index  : 1
                        value  : { en_US: 'Hello', es_ES: 'Hola', fr_FR: 'Bonjour' }
                        value2 : { en_US: 'Bye', es_ES: 'Adiós', fr_FR: 'Au revoir' }
                        child  : translatable._id

            it 'should respond to `toObjectTranslated()`', ->
                expect(Translatable.findOne(index: 1).exec()).to.eventually.respondTo('toObjectTranslated')

            it 'should respond to `toJSONTranslated()`', ->
                expect(Translatable.findOne(index: 1).exec()).to.eventually.respondTo('toJSONTranslated')

            it 'should act the same as `toObject()` and `toJSON()` without `translation` passed', ->
                Translatable.findOne(index: 1).exec()
                .then (translatable) ->
                    object = translatable.toObjectTranslated()
                    expect(object).to.have.deep.property('value.en_US').that.equals('Hello')
                    expect(object).to.have.deep.property('value.es_ES').that.equals('Hola')
                    expect(object).to.have.deep.property('value.fr_FR').that.equals('Bonjour')
                    expect(object).to.have.deep.property('value2.en_US').that.equals('Bye')
                    expect(object).to.have.deep.property('value2.es_ES').that.equals('Adiós')
                    expect(object).to.have.deep.property('value2.fr_FR').that.equals('Au revoir')

                    json = translatable.toJSONTranslated()
                    expect(object).to.have.deep.property('value.en_US').that.equals('Hello')
                    expect(object).to.have.deep.property('value.es_ES').that.equals('Hola')
                    expect(object).to.have.deep.property('value.fr_FR').that.equals('Bonjour')
                    expect(object).to.have.deep.property('value2.en_US').that.equals('Bye')
                    expect(object).to.have.deep.property('value2.es_ES').that.equals('Adiós')
                    expect(object).to.have.deep.property('value2.fr_FR').that.equals('Au revoir')

            it 'should accept an option `translation` and translation all the i18n fields', ->
                Translatable.findOne(index: 1).exec()
                .then (translatable) ->
                    object = translatable.toObjectTranslated(translation: 'es_ES')
                    expect(object).to.have.property('value').that.equals('Hola')
                    expect(object).to.have.property('value2').that.equals('Adiós')

                    json = translatable.toJSONTranslated(translation: 'fr_FR')
                    expect(json).to.have.property('value').that.equals('Bonjour')
                    expect(json).to.have.property('value2').that.equals('Au revoir')

            it 'should work with `populate`', ->
                Translatable.findOne(index: 1).populate('child').exec()
                .then (translatable) ->
                    object = translatable.toObjectTranslated(translation: 'es_ES')
                    expect(object).to.have.property('value').that.equals('Hola')
                    expect(object).to.have.property('value2').that.equals('Adiós')
                    expect(object).to.have.deep.property('child.value').that.equals('Mañana')

                    json = translatable.toJSONTranslated(translation: 'fr_FR')
                    expect(json).to.have.property('value').that.equals('Bonjour')
                    expect(json).to.have.property('value2').that.equals('Au revoir')
                    expect(json.child).to.have.property('value').that.equals('Matin')

            describe 'With array of embedded documents', ->

                before ->
                    TranslatableSchema = new Schema
                        index    : Number
                        value    : { type: String, i18n: true }
                        value2   : { type: String, i18n: true }
                        children : [
                            type : Schema.Types.ObjectId
                            ref  : 'Translatable_2_1'
                        ]

                    TranslatableSchema.plugin(i18n, { languages: ['en_US', 'es_ES', 'fr_FR'], defaultLanguage: 'en_US' })

                    Translatable = mongoose.model('Translatable_2_1', TranslatableSchema)

                    Q.all [
                        Translatable.create
                            index   : 0
                            value   : { en_US: 'Morning', es_ES: 'Mañana', fr_FR: 'Matin' }

                        Translatable.create
                            index   : 1
                            value   : { en_US: 'Good night', es_ES: 'Buenas noches', fr_FR: 'Bonne nuit' }
                    ]
                    .spread (translatable1, translatable2) ->
                        Translatable.create
                            index    : 2
                            value    : { en_US: 'Hello', es_ES: 'Hola', fr_FR: 'Bonjour' }
                            value2   : { en_US: 'Bye', es_ES: 'Adiós', fr_FR: 'Au revoir' }
                            children : [
                                translatable1._id
                                translatable2._id
                            ]

                it 'should still work with `populate`', ->
                    Translatable.findOne(index: 2).populate('children').exec()
                    .then (translatable) ->
                        object = translatable.toObjectTranslated(translation: 'es_ES')
                        expect(object).to.have.property('value').that.equals('Hola')
                        expect(object).to.have.property('value2').that.equals('Adiós')
                        expect(object).to.have.deep.property('children').that.is.an('Array')
                                      .and.have.a.lengthOf(2)
                        expect(object.children[0]).to.have.property('value').that.equals('Mañana')
                        expect(object.children[1]).to.have.property('value').that.equals('Buenas noches')

                        json = translatable.toJSONTranslated(translation: 'fr_FR')
                        expect(json).to.have.property('value').that.equals('Bonjour')
                        expect(json).to.have.property('value2').that.equals('Au revoir')
                        expect(json).to.have.deep.property('children').that.is.an('Array')
                                    .and.have.a.lengthOf(2)
                        expect(json.children[0]).to.have.property('value').that.equals('Matin')
                        expect(json.children[1]).to.have.property('value').that.equals('Bonne nuit')
