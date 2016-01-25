var express = require('express')
var http = require('http')

import Backbeam from './'

// see http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.DynamoDBLocal.html
// run dynamo with java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
// var dynamo = new AWS.DynamoDB()
// dynamo.setEndpoint('http://localhost:8000')

Backbeam.prototype.serverStart = function(port=3333) {
  const port = 3333
  const app = express()

  app.use((req, res, next) => {
    this.readConfig()
      .then((config) => {
        var path = req.path.split('/')

        var endpoint = config.api.endpoints.filter((endpoint) => {
          if (endpoint.method !== req.method) return false
          var comps = endpoint.path.split('/')

          if (comps.length !== path.length) return false
          endpoint.params = {}
          var matches = path.every((comp) => {
            var c = comps.shift()
            if (c.substring(0, 1) === '{' && c.substring(c.length-2, 1)) {
              endpoint.params[c.substring(1, c.length-1)] = comp
              return true
            }
            return c === comp
          })

          return matches
        })[0]

        if (!endpoint) {
          return res.status(404).json({ message: 'Not found' })
        }

        var func = config.lambda.functions
          .filter((func) => func.functionName === endpoint.functionName)[0]

        if (!endpoint) {
          return res.status(500).json({
            message: `Lambda function ${endpoint.functionName} not found`
          })
        }

        var event = {
          header: req.headers,
          querystring: req.query,
          body: req.body,
          path: endpoint.params,
        }
        var context = {
          succeed: function(output) {
            if (endpoint.output === 'html') {
              res.contentType('text/html')
              res.send(output.html)
            } else {
              res.json(output)
            }
          }
        }
        var controller = require(this._fullpath(func.filename))
        controller[func.handler](event, context)
      })
      .catch((e) => {
        return res.status(500).json({
          message: e.message || `Internal error`
        })
      })
  })
  http.createServer(app).listen(port)

  return app
}
