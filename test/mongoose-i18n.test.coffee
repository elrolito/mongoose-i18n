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
