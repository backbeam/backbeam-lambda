var express = require('express')
var http = require('http')
var utils = require('./utils')
var AWS = require('aws-sdk')

// see http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tools.DynamoDBLocal.html
// run dynamo with java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
var dynamo = new AWS.DynamoDB()
dynamo.setEndpoint('http://localhost:8000')

module.exports = function(yargs) {
  var argv = yargs.options({
    'port': {
      alias: 'p',
      default: process.env.PORT || 3000,
      describe: 'HTTP server port',
      type: 'number',
    }
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv

  var port = argv.port
  var app = express()
  var routes = utils.readRoutes()
  app.use(function(req, res, next) {
    var path = req.path.split('/').slice(2)

    var route = routes.filter(function(route) {
      if (route.method !== req.method) return false
      var comps = route.path.split('/').slice(1)

      if (comps.length !== path.length) return false
      route.params = {}
      var matches = path.every(function(comp) {
        var c = comps.shift()
        if (c.substring(0, 1) === '{' && c.substring(c.length-2, 1)) {
          route.params[c.substring(1, c.length-1)] = comp
          return true
        }
        return c === comp
      })

      return matches
    })[0]

    if (!route) {
      return res.status(404).json({ message: 'Not found' })
    }

    var event = {
      header: req.headers,
      querystring: req.query,
      body: req.body,
      path: route.params,
    }
    var context = {
      succeed: function(output) {
        if (route.output === 'html') {
          res.contentType('text/html')
          res.send(output.html)
        } else {
          res.json(output)
        }
      }
    }
    var filename = require('path').join(process.cwd(), 'web/controllers/'+route.function)
    var controller = require(filename)
    controller[route.handler](event, context)
  })
  http.createServer(app).listen(port)
  console.log('Started server at port %d', port)
}
