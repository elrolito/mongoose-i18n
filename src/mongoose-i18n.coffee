# Solr Queue Worker
# ==============================================================================

_ = require 'lodash'
mongoose = require 'mongoose'
Q = require 'q'
solr = require 'solr-client'

queues = require '../queues'

db = require('../mongo-client')('Solr Queue', queues.solr)

options =
  host: process.env.SOLR_HOST || 'localhost'
  port: process.env.SOLR_PORT || 8983
  core: process.env.SOLR_CORE || 'combined'

client = solr.createClient options

client.autoCommit = false

# Queue
# ----------------------------------------------------------------------

concurrency = Number(process.env.SOLR_WORKERS) || 12

queues.solr.process (task, done) ->
  processSolrTask(task)
    .then(
      (response) ->
        console.log task.id, response

        return done()

      , (error) ->
        console.error error.message

        task.retries++

        if task.retries > 5
          task = error = null

        return done(error, task)

      , (progress) ->
        console.info progress.message
    )

, concurrency

processSolrTask = (task) ->
  deferred = Q.defer()

  Model = mongoose.models[task.model]

  Q.try( ->
    deferred.notify message: "Finding #{task.id} (#{task.model})"

    query = Model.findById(task.id)
    if task.model is 'Statute'
      query = query.populate('explanatoryNote')

    Q.when query.exec(), (doc) ->
      deferred.reject new Error "#{task.id} does not exist" unless doc?

      if doc?
        docs = []

        _.map doc.locales, (locale) ->
          docs.push doc.solrDoc(locale)

        client.add docs, (err, response) ->
          deferred.reject err if err
          deferred.resolve response
  )
  .catch(
    (error) ->
      deferred.reject error
  )

  return deferred.promise

# Process Startup and Shutdown
# ----------------------------------------------------------------------

queues.solr.pause()

# Graceful shutdown
process.on 'SIGINT', ->
  console.log 'Pausing queues and exiting gracefully...'
  queues.solr.pause()
  db.close()

  process.exit(0)

exports.task = processSolrTask