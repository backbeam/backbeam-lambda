var fs = require('fs')
var path = require('path')
var AWS = require('aws-sdk')
var ini = require('ini')
var uuid = require('node-uuid')
var pify = require('pify')
var mkdirp = pify(require('mkdirp'))

import promisify from './utils/promisify'

const EventEmitter = require('events')

export default class Backbeam extends EventEmitter {

  constructor (dir) {
    super()
    this.setRegion(this.availableRegions()[0])
    this.setDirectory(dir)
    this.credentialsLoaded = false
  }

  _credentialsPath () {
    var home = require('os').homedir()
    return path.join(home, '.aws/credentials')
  }

  loadCredentials () {
    var profile = process.env.AWS_PROFILE || 'default'
    var file = this._credentialsPath()

    return promisify(fs, 'readFile', file, 'utf8')
      .then((data) => {
        let credentials = ini.parse(data)[profile] || {}
        let accessKeyId = credentials.aws_access_key_id
        let secretAccessKey = credentials.aws_secret_access_key
        if (!accessKeyId || !secretAccessKey) {
          return Promise.reject(new Error('No credentials found in ~/.aws/credentials'))
        }
        AWS.config.update({ accessKeyId, secretAccessKey })
        this.credentialsLoaded = true
        this.emit('credentials_changed')
      })
  }

  saveCredentials (accessKeyId, secretAccessKey, profile = 'default') {
    var file = this._credentialsPath()
    AWS.config.update({ accessKeyId, secretAccessKey })

    return promisify(new AWS.APIGateway(), 'getRestApis', {}) // checks that the credentials work
      .then(() => mkdirp(path.dirname(file)))
      .then(() => {
        var data = ini.encode({
          [profile]: {
            aws_access_key_id: accessKeyId,
            aws_secret_access_key: secretAccessKey
          }
        })
        return promisify(fs, 'writeFile', file, data)
      })
      .then(() => {
        this.credentialsLoaded = true
        this.emit('credentials_changed')
      })
  }

  getDirectory () {
    return this._dir
  }

  setRegion (region) {
    AWS.config.update({ region })
    this._region = region
  }

  getRegion () {
    return this._region
  }

  _fullpath (filename) {
    return path.join(this._dir, filename)
  }

  _parseFile (filename) {
    var file = this._fullpath(filename)
    return promisify(fs, 'readFile', file)
      .then((data) => JSON.parse(data))
  }

  _writeFile (filename, data, override = true) {
    var file = path.join(this._dir, filename)
    var options = typeof data !== 'string' ? JSON.stringify(data, null, 2) : data
    if (!override) {
      return new Promise((resolve) => fs.exists(file, resolve))
        .then((exists) => {
          if (exists) return
          return promisify(fs, 'writeFile', file, options)
        })
    }
    return promisify(fs, 'writeFile', file, options)
  }

  _deleteFile (filename) {
    var file = path.join(this._dir, filename)
    return promisify(fs, 'unlink', file)
  }

  setDirectory (dir) {
    this._dir = dir
    this.emit('directory_changed')
  }

  writeConfig (data) {
    return this._writeFile('backbeam.json', data)
  }

  readConfig () {
    return this._parseFile('backbeam.json')
  }

  // see http://docs.aws.amazon.com/general/latest/gr/rande.html#apigateway_region
  // and http://docs.aws.amazon.com/general/latest/gr/rande.html#lambda_region
  availableRegions () {
    return ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-northeast-1']
  }

}

require('./init')
require('./api')
require('./lambda')
require('./iam')
require('./dynamo')
require('./server')
require('./job')
