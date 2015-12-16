var txain = require('txain')
var utils = require('./utils')
var AWS = require('aws-sdk')
var _ = require('underscore')
var inquirer = require('inquirer')
var util = require('util')

module.exports = function(yargs) {
  yargs.command('create', 'Creates a new AWS API', function (yargs) {
    module.exports.create(utils.end)
  })
  .command('select', 'Selects an existing AWS API to be used for creating API resources', function (yargs) {
    module.exports.select(utils.end)
  })
  .command('show', 'Shows the information of an existing AWS API', function(yargs) {
    module.exports.show(utils.end)
  })
  .command('deploy', 'Synchronizes and deploys the API to the selected stage', function(yargs) {
    module.exports.deploy(utils.end)
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv
}

module.exports.show = function(callback) {
  var config = utils.readConfig()
  var api = config.api
  if (!api) {
    console.log('No API selected yet. Please use `backbeam-lambda api select` to select an existing API')
    process.exit(1)
  }
  console.log(api.name, '('+api.description+')', api.id)
  callback()
}

module.exports.deploy = function(callback) {
  var region = utils.requiresRegion()
  var api = utils.requiresAPI()
  var stage = utils.requiresStage()
  var apigateway = new AWS.APIGateway()
  console.log('Deploying API (%s) to region %s and stage %s', api.name, region, stage)

  txain(function(callback) {
    var params = {
      restApiId: api.id,
      stageName: stage,
    }
    apigateway.createDeployment(params, callback)
  })
  .then(function(response, callback) {
    var url = 'https://'+api.id+'.execute-api.eu-west-1.amazonaws.com/'+stage
    console.log('API deployed successfully')
    console.log('Invoke URL:', url)
  })
  .end(callback)
}

module.exports.create = function(callback) {
  var region = utils.requiresRegion()
  console.log('Creating API for region', region)
  var apigateway = new AWS.APIGateway()

  var questions = [
    {
      name: 'name',
      message: 'API name',
    },
    {
      name: 'description',
      message: 'API description',
    }
  ]
  inquirer.prompt(questions, function(answers) {
    txain(function(callback) {
      apigateway.createRestApi(answers, callback)
    })
    .then(function(api, callback) {
      var config = utils.readConfig()
      config.api = _.pick(api, 'id', 'name', 'description')
      utils.writeConfig(config)
      console.log('Updated API configuration successfully')
      callback()
    })
    .end(callback)
  })
}

module.exports.select = function(callback) {
  var region = utils.requiresRegion()
  console.log('Querying APIs for region', region)

  var apigateway = new AWS.APIGateway()

  txain(function(callback) {
    apigateway.getRestApis({}, callback)
  })
  .then(function(data, callback) {
    if (data.items.length === 0) {
      var question = {
        name: 'create',
        type: 'confirm',
        message: 'No existing APIs found. Do you want to create one?',
      }
      inquirer.prompt([question], function(answers) {
        if (answers.create) {
          module.exports.create(callback)
        }
      })
      return
    }

    var choices = data.items.map(function(item) {
      return {
        name: item.name,
        value: item,
      }
    })
    choices.push(new inquirer.Separator())
    choices.push({ name: 'Or create a new API', value: '' })

    var question = {
      name: 'api',
      type: 'list',
      choices: choices,
      message: 'Choose an API',
    }
    inquirer.prompt([question], function(answers) {
      var api = answers.api
      if (!api) {
        return module.exports.create(callback)
      }
      var config = utils.readConfig()
      config.api = _.pick(api, 'id', 'name', 'description')
      utils.writeConfig(config)
      console.log('Updated API configuration successfully')
      callback()
    })
  })
  .end(callback)
}
