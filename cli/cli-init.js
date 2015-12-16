var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var txain = require('txain')
var colors = require('colors')
var version = require('../package.json').version
var _ = require('underscore')
var utils = require('./utils')

module.exports = function(yargs) {
  var argv = yargs.options({
    'd': {
      alias: 'directory',
      default: process.cwd(),
      describe: 'Directory where the new project will be created',
      type: 'string',
    }
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv

  console.log('Creating project at %s', argv.directory)
  var projectName = path.basename(argv.directory)

  txain(function(callback) {
    mkdirp(argv.directory, callback)
  })
  .then(function(callback) {
    // configuration
    var configFile = path.join(argv.directory, 'config.json')
    var exists = fs.existsSync(configFile)
    if (exists) return callback()
    var data = {
      projectName: projectName,
      region: null,
      api: null,
      stage: null,
    }
    fs.writeFile(configFile, JSON.stringify(data, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    require('./cli-region').select(callback)
  })
  .then(function(callback) {
    require('./cli-api').select(callback)
  })
  // The REST API doesn't contain any methods
  // .then(function(callback) {
  //   require('./cli-stage').select(callback)
  // })
  .then(function(callback) {
    require('./cli-role').select(callback)
  })
  .then(function(callback) {
    // directories
    var dirs = [
      'web/assets',
      'web/views',
      'web/controllers',
      'web/libs',
      'test',
    ]
    dirs = dirs.map(function(dir) {
      return path.join(argv.directory, dir)
    })
    txain(dirs).each(mkdirp).end(callback)
  })
  .then(function(callback) {
    // routes
    var routesFile = path.join(argv.directory, 'web/controllers/routes.json')
    var exists = fs.existsSync(routesFile)
    if (exists) return callback()
    var data = [
      {
        'method': 'GET',
        'path': '/',
        'function': 'home',
        'handler': 'run',
      }
    ]
    fs.writeFile(routesFile, JSON.stringify(data, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    // home controller
    var controllerFile = path.join(argv.directory, 'web/controllers/home.js')
    var exists = fs.existsSync(controllerFile)
    if (exists) return callback()
    var code = `
      exports.run = function(req, res, event, context) {
        res.send('Hello world')
      }
    `
    fs.writeFile(controllerFile, code, 'utf8', callback)
  })
  .then(function(callback) {
    var packageJson = path.join(argv.directory, 'package.json')
    var exists = fs.existsSync(packageJson)
    if (exists) return callback()

    var data = {
      private: true,
      name: projectName,
      version: '1.0.0',
      description: 'Node.js app made with backbeam-lambda',
      scripts: {
        start: 'node app',
        test: 'NODE_ENV=test mocha --bail --reporter spec test/',
      },
      author: {
        name: process.env.USER || '',
      },
      license: 'ISC',
      dependencies: {
        'aws-sdk': '2.2.3', // see http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
      },
      devDependencies: {
        'mocha': '^1.21.4',
      },
      keywords: ['backbeam'],
      engines: {
        node : '0.10.36', // see http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
      }
    }
    fs.writeFile(packageJson, JSON.stringify(data, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    var testUtils = path.join(argv.directory, 'test', 'test-utils.js')
    var exists = fs.existsSync(testUtils)
    if (exists) return callback()

    var code = `
      var txain = require('txain')
      var assert = require('assert')

      var request = require('supertest')(require('../app').app)
      exports.request = request
    `
    fs.writeFile(testUtils, code, 'utf8', callback)
  })
  .then(function(callback) {
    console.log('Project created. Run `npm install` to install dependencies')
    callback()
  })
  .end(utils.end)
}

if (module.id === require.main.id) {
  exports.run()
}
