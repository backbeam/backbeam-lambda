var _ = require('underscore')
var fs = require('fs')
var utils = require('./utils')
var txain = require('txain')
var path = require('path')
var inquirer = require('inquirer')
var multiline = require('multiline')
var AWS = require('aws-sdk')
require('colors')

var configurationKeys = ['timeout', 'memory_size', 'role', 'description']

module.exports = function(yargs) {
  yargs.command('defaults', 'Handles default values for new controllers', function (yargs) {

    yargs.command('set', 'Sets the default value of a key for new controllers', function(yargs) {
      var questions = [
        {
          'name': 'key',
          'type': 'list',
          'choices': configurationKeys,
          'message': 'Choose the setting you want to set',
        },
        {
          'name': 'value',
          'message': 'Write the value for this setting',
        },
      ]
      inquirer.prompt(questions, function(answers) {
        var config = utils.readConfig()
        config.defaults = config.defaults || {}
        config.defaults.controllers = config.defaults.controllers || {}
        config.defaults.controllers[answers.key] = answers.value
        utils.writeConfig(config)
        console.log('Updated controllers defaults configuration successfully')
      })
    })

    yargs.command('get', 'Gets the current defaults values', function(yargs) {
      var config = utils.readConfig()
      config.defaults = config.defaults || {}
      config.defaults.controllers = config.defaults.controllers || {}
      configurationKeys.forEach(function(key) {
        console.log(key.white.bold)
        console.log('  ', config.defaults.controllers[key] || 'not defined')
      })
    })

    yargs.help('help')
  })
  .command('create', 'Creates a new controller and the required API resources to map it to a URL', function (yargs) {
    var questions = [
      {
        'name': 'function',
        'message': 'Function name',
      },
      {
        'name': 'method',
        'message': 'HTTP method',
        'type': 'list',
        'choices': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH', 'OPTIONS'],
        'default': 'GET',
      },
      {
        'name': 'path',
        'message': 'HTTP path',
        'default': '/',
      },
      {
        'name': 'handler',
        'message': 'JavaScript method name',
        'default': 'run',
      },
      {
        'name': 'input',
        'message': 'HTTP Content-Type input type',
        'type': 'list',
        'choices': ['json', 'form'],
        'default': 'json',
      },
      {
        'name': 'output',
        'message': 'HTTP Content-Type output type',
        'type': 'list',
        'choices': ['json', 'html'],
        'default': 'json',
      },
    ]

    inquirer.prompt(questions, function(answers) {
      txain(function(callback) {
        var filename = path.join(process.cwd(), 'web/controllers/'+answers['function']+'.js')
        var code = multiline.stripIndent(function() {;/*
          exports.HANDLER = function(req, res, event, context) {
            res.send('Hello world')
          }
        */}).replace('HANDLER', answers.handler)
        fs.writeFile(filename, code, 'utf-8', callback)
      })
      .then(function(data, callback) {
        var routes = utils.readRoutes()
        routes.push(_.pick(answers, 'method', 'path', 'function', 'handler'))
        utils.writeRoutes(routes)
        callback()
      })
      .end(utils.end)
    })
  })
  .command('delete', 'Deletes a controller', function (yargs) {
    utils.notImplemented()
  })
  .command('set', 'Sets the value of a configuration key for an existing controller', function(yargs) {
    utils.notImplemented()
  })
  .command('sync', 'Synchronizes the controller with AWS. It creates or updates the lambda function and all the API resources if needed', function(yargs) {
    utils.requiresRegion()
    utils.requiresAPI()

    var choices = recentControllers().map(function(route) {
      return route['function']
    })
    var question = {
      'name': 'function',
      'message': 'Function to be synched',
      'type': 'list',
      'choices': choices,
      'validate': function(foo) {
        return true
      }
    }
    inquirer.prompt([question], function(answers) {
      var functionName = answers['function']
      module.exports.sync(functionName, utils.end)
    })
  })
  .command('list', 'Lists the available controllers and their mappings', function(yargs) {
    var argv = yargs
      .help('help')
      .argv
  })
  // TODO: open, test
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv
}

function recentControllers() {
  var routes = utils.readRoutes()
  routes.forEach(function(route) {
    // TODO: if controller no longer exists
    route.stat = fs.statSync(path.join('web/controllers', route['function']+'.js'))
  })
  return routes.sort(function(a, b) {
    return a.stat.mtime < b.stat.mtime ? 1 : -1
  }) // .slice(0, 20)
}

module.exports.sync = function(functionName, callback) {
  var region = utils.requiresRegion()
  var api = utils.requiresAPI()
  var routes = utils.readRoutes()
  var route = _.findWhere(routes, { 'function': functionName })

  if (!route) {
    console.log('No controller found with that function name')
    process.exit(1)
  }

  var config = utils.readConfig()
  config.defaults = config.defaults || {}
  config.defaults.controllers = config.defaults.controllers || {}

  var controller = _.extend({}, route, config.defaults.controllers)

  var lambda = new AWS.Lambda()
  var apigateway = new AWS.APIGateway()

  var parentResource, resourceId

  txain(function(callback) {
    var zipfile = path.join(__dirname, 'foo.zip') // TODO: temp file
    var filename = path.join(process.cwd(), 'web/controllers/'+controller['function']+'.js')
    var code = fs.readFileSync(filename, 'utf-8')
    var writeStream = fs.createWriteStream(zipfile)
    var archiver = require('archiver')('zip')
    archiver.pipe(writeStream)
    archiver.append(code, { name: 'index.js' })
    archiver.finalize()
    writeStream.on('close', function() {
      fs.readFile(zipfile, callback)
    })
  })
  .then(function(data, callback) {
    if (!route.functionArn) {
      txain(function(callback) {
        var params = {
          Code: {
            ZipFile: data,
          },
          FunctionName: functionName,
          Handler: 'index.handler',
          Role: controller.role,
          Runtime: 'nodejs',
          Description: controller.description,
          MemorySize: controller.memorySize,
          Publish: false,
          Timeout: controller.timeout,
        }
        console.log('Creating lambda function')
        lambda.createFunction(params, callback)
      })
      .then(function(body, callback) {
        route.functionArn = body.FunctionArn
        utils.writeRoutes(routes)

        console.log('Adding permission to lambda function')

        var uuid = require('node-uuid')
        var params = {
          Action: 'lambda:InvokeFunction',
          FunctionName: functionName,
          Principal: 'apigateway.amazonaws.com',
          StatementId: uuid.v4(),
        };
        lambda.addPermission(params, callback)
      })
      .end(callback)
    } else {
      txain(function(callback) {
        var params = {
          ZipFile: data,
          FunctionName: functionName,
          Publish: false,
        }
        console.log('Updating lambda function code')
        lambda.updateFunctionCode(params, callback)
      })
      .then(function(callback) {
        var params = {
          FunctionName: functionName,
          Handler: 'index.handler',
          Role: controller.role,
          Description: controller.description,
          MemorySize: controller.memorySize,
          Timeout: controller.timeout,
        }
        console.log('Updating function configuration')
        lambda.updateFunctionConfiguration(params, callback)
      })
      .end(callback)
    }
  })
  .then(function(callback) {
    console.log('Creating API resources')
    apigateway.getResources({ restApiId: api.id }, callback)
  })
  .then(function(data, callback) {
    var resources = data.items
    resources.forEach(function(resource) {
      if (controller.path.indexOf(resource.path) === 0
        && (!parentResource || resource.path.length > parentResource.path.length)) {
          parentResource = resource
      }
    })
    var pathParts = _.compact(controller.path.substring(parentResource.path.length).split('/'))
    callback(null, pathParts)
  })
  .each(function(part, callback) {
    txain(function(callback) {
      var params = {
        restApiId: api.id,
        parentId: parentResource.id,
        pathPart: part,
      }
      apigateway.createResource(params, callback)
    })
    .then(function(body, callback) {
      console.log('body', body)
      parentResource = body
      callback()
    })
    .end(callback)
  })
  .then(function(callback) {
    resourceId = parentResource.id
    var method = parentResource.resourceMethods[controller.method]

    txain(function(callback) {
      if (!method) return callback()
      var params = {
        restApiId: api.id,
        resourceId: resourceId,
        httpMethod: controller.method,
      }
      apigateway.deleteMethod(params, callback)
    })
    .then(function(callback) {
      var params = {
        authorizationType: 'none',
        httpMethod: controller.method,
        resourceId: resourceId,
        restApiId: api.id,
        apiKeyRequired: false,
      }
      apigateway.putMethod(params, callback)
    })
    .end(callback)
  })
  .then(function(body, callback) {
    // console.log('body', body)
    console.log('Creating integration')
    var params = {
      restApiId: api.id,
      resourceId: resourceId,
      httpMethod: controller.method,
      integrationHttpMethod: 'POST', // always POST?
      type: 'AWS',
      uri: 'arn:aws:apigateway:'+AWS.config.region+':lambda:path/2015-03-31/functions/'+route.functionArn+'/invocations',
      requestTemplates: {
        'application/json': multiline.stripIndent(function() {;/*
          {
            "querystring" : "#foreach($key in $input.params().querystring.keySet())#if($foreach.index > 0)&#end$util.urlEncode($key)=$util.urlEncode($input.params().querystring.get($key))#end",
            "body" : $input.json('$')
          }
        */})
      },
    }
    apigateway.putIntegration(params, callback)
  })
  .then(function(callback) {
    console.log('Creating integration response')
    var params = {
      httpMethod: controller.method,
      resourceId: resourceId,
      restApiId: api.id,
      statusCode: '200',
      responseParameters: {},
      responseTemplates: {},
      selectionPattern: '.*',
    }
    apigateway.putIntegrationResponse(params, callback)
  })
  .then(function(body, callback) {
    console.log('Creating method response')
    var params = {
      httpMethod: controller.method,
      resourceId: resourceId,
      restApiId: api.id,
      statusCode: '200',
      responseParameters: {},
      responseTemplates: {},
    };
    apigateway.putIntegrationResponse(params, callback)
  })
  .end(callback)
}
