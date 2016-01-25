var fs = require('fs')
var path = require('path')
var temp = require('temp').track()
var uuid = require('node-uuid')
var AWS = require('aws-sdk')
var pify = require('pify')
var archiver = require('archiver')
var webpack = pify(require('webpack'))

import dedent from 'dedent'
import Backbeam from './'
import promisify from './utils/promisify'
import sanitize from './utils/sanitize'

Backbeam.prototype._findFunction = function(data, params) {
  return data.lambda.functions.find(func => {
    return func.functionName === params.functionName
  })
}

Backbeam.prototype.lambdaCreateFunction = function(params) {
  return Promise.resolve()
    .then(() => {
      params = sanitize(params, {
        functionName: 'string',
        description: 'string?',
        filename: 'string',
        handler: 'string',
        role: 'string',
        memory: 'number',
        timeout: 'number',
      })
    })
    .then(() => this.readConfig())
    .then(data => {
      var func = this._findFunction(data, params)
      if (func) {
        return Promise.reject(new Error(`A function named ${params.functionName} already exists`))
      }
      var functions = data.lambda.functions
      functions.push(params)
      return this.writeConfig(data)
    })
    .then(() => {
      var code = dedent`
        var aws = require('aws-sdk')

        exports.${params.handler} = function(event, context) {
          context.succeed({ message: 'hello world' })
        }
      `
      return this._writeFile(params.filename, code)
    })
    .then(() => this.emit('lambda_changed'))
}

Backbeam.prototype.lambdaEditFunction = function(params) {
  return this.readConfig()
    .then(data => {
      var functions = data.lambda.functions
      var func = this._findFunction(data, params)
      if (!func) {
        return Promise.reject(new Error(`No function named ${params.functionName} found`))
      }
      Object.assign(func, params)
      return this.writeConfig(data)
    })
    .then(() => this.emit('lambda_changed'))
}

Backbeam.prototype.lambdaDeleteFunction = function(params) {
  return this.readConfig()
    .then(data => {
      var functions = data.lambda.functions
      var func = this._findFunction(data, params)
      if (!func) {
        return Promise.reject(new Error(`No function named ${params.functionName} found`))
      }
      functions.splice(functions.indexOf(func), 1)
      return this.writeConfig(data)
        .then(() => {
          this._deleteFile(func.filename)
            .catch(e => console.warn('Ignoring', e))
        })
    })
    .then(() => this.emit('lambda_changed'))
}

Backbeam.prototype.lambdaSyncFunction = function(functionName) {
  var lambda = new AWS.Lambda()
  var bundlefile = temp.path({ suffix: '.js' })
  var zipfile = temp.path({ suffix: '.zip' })
  var func, config

  var job = this._random()
  this.emit('job:start', { id: job, name: `Synching lambda function ${functionName}`, steps: 4 })

  return this.readConfig()
    .then((data) => {
      config = data
      func = data.lambda.functions.filter(func => func.functionName === functionName)[0]
      if (!func) return Promise.reject(new Error(`Function ${functionName} not found`))

      this.emit('job:progress', { id: job, log: `Bundling code` })
      return webpack({
        entry: [this._fullpath(func.filename)],
        output: {
          path: path.dirname(bundlefile),
          filename: path.basename(bundlefile),
          library: 'handler',
          libraryTarget: 'commonjs',
        },
        target: 'node',
        externals: {
          'aws-sdk': 'commonjs aws-sdk',
        },
        module: {
          loaders: [
            {
              test: '.js',
              loaders: ['babel'],
              query: {
                presets: ['es2015']
              }
            }
          ]
        }
      })
    })
    .then((stats) => {
      this.emit('job:progress', { id: job, log: `Zipping bundle` })
      func.hash = stats.hash
      return pify(fs.readFile)(bundlefile, 'utf8')
    })
    .then((code) => {
      return new Promise((resolve, reject) => {
        var writeStream = fs.createWriteStream(zipfile)
        var zip = archiver('zip')
        zip.pipe(writeStream)
        zip.append(code, { name: 'index.js' })
        zip.finalize()
        writeStream.on('close', function() {
          fs.readFile(zipfile, (err, data) => err ? reject(err) : resolve(data))
        })
        writeStream.on('error', reject)
      })
    })
    .then((data) => {
      if (!func.functionArn) {
        this.emit('job:progress', { id: job, log: `Creating lambda function` })
        var params = {
          Code: {
            ZipFile: data,
          },
          FunctionName: func.functionName,
          Handler: 'index.'+func.handler,
          Role: func.role,
          Runtime: 'nodejs',
          Description: func.description,
          MemorySize: func.memory,
          Publish: false,
          Timeout: func.timeout,
        }
        return promisify(lambda, 'createFunction', params)
          .then((body) => {
            func.functionArn = body.FunctionArn

            this.emit('job:progress', { id: job, log: `Adding permissions` })
            var params = {
              Action: 'lambda:InvokeFunction',
              FunctionName: func.functionName,
              Principal: 'apigateway.amazonaws.com',
              StatementId: uuid.v4(),
            }
            return promisify(lambda, 'addPermission', params)
          })
      } else {
        this.emit('job:progress', { id: job, log: `Updating function code` })
        var params = {
          ZipFile: data,
          FunctionName: func.functionName,
          Publish: false,
        }
        return promisify(lambda, 'updateFunctionCode', params)
          .then(() => {
            this.emit('job:progress', { id: job, log: `Updating function configuration` })
            var params = {
              FunctionName: func.functionName,
              Handler: 'index.handler',
              Role: func.role,
              Description: func.description,
              MemorySize: func.memorySize,
              Timeout: func.timeout,
            }
            return promisify(lambda, 'updateFunctionConfiguration', params)
          })
      }
    })
    .then(() => this.writeConfig(config))
    .then(() => this.emit('job:succees', { id: job }))
    .catch((e) => {
      this.emit('job:fail', { id: job, error: e })
      return Promise.reject(e)
    })
}
