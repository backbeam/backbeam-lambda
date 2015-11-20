var colors = require('colors')
var version = require('../package.json').version
var txain = require('txain')
var util = require('util')
var fs = require('fs')
var path = require('path')

exports.notImplemented = function() {
  console.log('Not implemented'.red)
  process.exit(1)
}

exports.end = function(err) {
  if (err) {
    if (err.stack) {
      console.error(err.stack.red)
    } else {
      console.error(err.message || err)
    }
  }
}

exports.requiresRegion = function() {
  var config = exports.readConfig()
  if (!config.region) {
    console.log('Please configure your AWS region with `backbeam-lambda region select`')
    process.exit(1)
  } else {
    var AWS = require('aws-sdk')
    AWS.config.update({region: config.region})
    return config.region
  }
}

exports.requiresAPI = function() {
  var config = exports.readConfig()
  if (!config.api) {
    console.log('Please configure your AWS API with `backbeam-lambda api select')
    process.exit(1)
  } else {
    return config.api
  }
}

exports.requiresStage = function() {
  var config = exports.readConfig()
  if (!config.stage) {
    console.log('Please configure your AWS stage with `backbeam-lambda stage select`')
    process.exit(1)
  } else {
    return config.stage
  }
}

exports.configFile = function() {
  return path.join(process.cwd(), 'config.json')
}

exports.readConfig = function() {
  return JSON.parse(fs.readFileSync(exports.configFile()))
}

exports.writeConfig = function(config) {
  fs.writeFileSync(exports.configFile(), JSON.stringify(config, null, 2))
}

exports.routesFile = function() {
  return path.join(process.cwd(), 'web/controllers/routes.json')
}

exports.readRoutes = function() {
  return JSON.parse(fs.readFileSync(exports.routesFile()))
}

exports.writeRoutes = function(routes) {
  fs.writeFileSync(exports.routesFile(), JSON.stringify(routes, null, 2))
}
