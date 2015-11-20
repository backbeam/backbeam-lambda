var txain = require('txain')
var utils = require('./utils')
var AWS = require('aws-sdk')
var _ = require('underscore')
var inquirer = require('inquirer')

module.exports = function(yargs) {
  yargs.command('create', 'Creates a new AWS stage', function (yargs) {
    module.exports.create(utils.end)
  })
  .command('select', 'Selects an existing AWS stage to be used for deploying', function (yargs) {
    module.exports.select(utils.end)
  })
  .command('show', 'Shows the information of an existing AWS stage', function(yargs) {
    module.exports.show(utils.end)
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv
}

module.exports.show = function(callback) {
  var config = utils.readConfig()
  var stage = config.stage
  if (!stage) {
    console.log('No stage selected yet. Please use `backbeam stage select` to select an existing stage')
    process.exit(1)
  }
  console.log(stage)
  callback()
}

module.exports.create = function(callback) {
  var region = utils.requiresRegion()
  var api = utils.requiresAPI()
  console.log('Creating API for region', region)
  var apigateway = new AWS.APIGateway()

  var question = {
    name: 'name',
    message: 'Stage name',
  }
  inquirer.prompt([question], function(answers) {
    txain(function(callback) {
      var params = {
        restApiId: api.id,
        stageName: answers.name,
      }
      apigateway.createDeployment(params, callback)
    })
    .then(function(api, callback) {
      var config = utils.readConfig()
      config.stage = answers.name
      utils.writeConfig(config)
      console.log('Updated stage configuration successfully')
    })
    .end(callback)
  })
}

module.exports.select = function(callback) {
  var region = utils.requiresRegion()
  var api = utils.requiresAPI()
  console.log('Querying stages for region %s and API %s', region, api.name)

  var apigateway = new AWS.APIGateway()

  txain(function(callback) {
    apigateway.getStages({ restApiId: api.id }, callback)
  })
  .then(function(data, callback) {
    if (data.item.length === 0) {
      var question = {
        name: 'create',
        type: 'confirm',
        message: 'No existing stages found. Do you want to create a new one?',
      }
      inquirer.prompt([question], function(answers) {
        if (answers.create) {
          module.exports.create(callback)
        }
      })
      return
    }

    var choices = data.item.map(function(item) {
      return item.stageName
    })
    choices.push(new inquirer.Separator())
    choices.push({ name: 'Or create a new stage', value: '' })

    var question = {
      name: 'stage',
      type: 'list',
      choices: choices,
      message: 'Choose a stage',
    }
    inquirer.prompt([question], function(answers) {
      var stage = answers.stage
      if (!stage) {
        return module.exports.create(callback)
      }
      var config = utils.readConfig()
      config.stage = stage
      utils.writeConfig(config)
      console.log('Updated stage configuration successfully')
      callback()
    })
  })
  .end(callback)
}
