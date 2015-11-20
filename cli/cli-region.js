var utils = require('./utils')
var inquirer = require('inquirer')

module.exports = function(yargs) {
  yargs.command('select', 'Selects an existing AWS region to be used for creating lambda functions and API resources', function (yargs) {
    module.exports.select(utils.end)
  })
  .command('show', 'Shows the current selected AWS region', function(yargs) {
    module.exports.show(utils.end)
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv
}

module.exports.show = function(callback) {
  utils.requiresRegion()
  var config = utils.readConfig()
  console.log(config.region)
}

module.exports.select = function(callback) {
  // For available regions
  // see http://docs.aws.amazon.com/general/latest/gr/rande.html#apigateway_region
  // and http://docs.aws.amazon.com/general/latest/gr/rande.html#lambda_region
  var question = {
    name: 'region',
    type: 'list',
    choices: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-northeast-1'],
    message: 'Choose a region',
  }
  inquirer.prompt([question], function(answers) {
    var config = utils.readConfig()
    config.region = answers.region
    utils.writeConfig(config)
    console.log('Updated region configuration successfully')
    callback()
  })
}
