var txain = require('txain')
var utils = require('./utils')
var AWS = require('aws-sdk')
var _ = require('underscore')
var inquirer = require('inquirer')

module.exports = function(yargs) {
  yargs.command('create', 'Creates a new AWS role', function (yargs) {
    module.exports.create(utils.end)
  })
  .command('select', 'Selects an existing AWS role to be used for new controllers', function (yargs) {
    module.exports.select(utils.end)
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv
}

module.exports.create = function(callback) {
  var region = utils.requiresRegion()
  console.log('Creating role for region', region)
  var iam = new AWS.IAM()

  var question = {
    name: 'name',
    message: 'Role name',
  }
  inquirer.prompt([question], function(answers) {
    txain(function(callback) {
      var policyDocument = {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
              "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      }
      var params = {
        RoleName: answers.name,
        AssumeRolePolicyDocument: JSON.stringify(policyDocument),
      }
      iam.createRole(params, callback)
    })
    .then(function(data, callback) {
      var role = data.Role
      var config = utils.readConfig()
      config.defaults = config.defaults || {}
      config.defaults.controllers = config.defaults.controllers || {}
      config.defaults.controllers.role = role.Arn
      utils.writeConfig(config)
      console.log('Updated role configuration successfully')
      callback()
    })
    .end(callback)
  })
}

module.exports.select = function(callback) {
  var region = utils.requiresRegion()
  console.log('Querying roles for region', region)

  var iam = new AWS.IAM()

  txain(function(callback) {
    iam.listRoles(callback)
  })
  .then(function(data, callback) {
    if (data.Roles.length === 0) {
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

    var choices = data.Roles.map(function(item) {
      return {
        name: item.RoleName,
        value: item,
      }
    })
    choices.push(new inquirer.Separator())
    choices.push({ name: 'Or create a new role', value: '' })

    var question = {
      name: 'role',
      type: 'list',
      choices: choices,
      message: 'Choose a role',
    }
    inquirer.prompt([question], function(answers) {
      var role = answers.role
      if (!role) {
        return module.exports.create(callback)
      }
      var config = utils.readConfig()
      config.defaults = config.defaults || {}
      config.defaults.controllers = config.defaults.controllers || {}
      config.defaults.controllers.role = role.Arn
      utils.writeConfig(config)
      console.log('Updated role configuration successfully')
      callback()
    })
  })
  .end(callback)
}
