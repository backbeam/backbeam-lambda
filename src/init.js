var fs = require('fs')
var path = require('path')
var pify = require('pify')
var mkdirp = pify(require('mkdirp'))

import dedent from 'dedent'
import Backbeam from './'
import promisify from './utils/promisify'
import sanitize from './utils/sanitize'

Backbeam.prototype.init = function(dir, params) {
  var projectName = params.name || path.basename(dir)

  return Promise.resolve()
    .then(() => {
      dir = sanitize({ dir }, { dir: 'string' }).dir
      params = sanitize(params, {
        region: 'string',
        name: 'string?',
        api: 'object',
        role: 'string?',
      })
      params.api = sanitize(params.api, {
        id: 'string',
        name: 'string',
        description: 'string?',
      })

      this._dir = dir
      this.setRegion(params.region)
    })
    .then(() => mkdirp(dir))
    .then(() => {
      var configFile = path.join(dir, 'backbeam.json')
      var exists = fs.existsSync(configFile)
      if (exists) return
      var data = {
        project: projectName,
        region: params.region,
        api: Object.assign({
          stage: null,
          endpoints: [],
        }, params.api),
        lambda: {
          defaults: {
            role: params.role,
            timeout: 60,
            memory: 128,
          },
          functions: [],
        },
        dynamo: {
          tables: [],
        }
      }
      return this.writeConfig(data)
    })
    .then(() => (
      Promise.all(['functions', 'test'].map(d => mkdirp(path.join(dir, d))))
    ))
    .then(() => {
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
          'backbeam-lambda': '^0.1.0',
          'mocha': '^1.21.4',
          'supertest': '^1.1.0',
        },
        keywords: ['backbeam', 'lambda', 'aws'],
        engines: {
          node : '0.10.36', // see http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
        }
      }
      return this._writeFile('package.json', data, false)
    })
    .then(() => {
      var code = dedent`
        var Backbeam = require('backbeam-lambda').default
        var backbeam = new Backbeam(process.cwd())

        var app = exports.app = backbeam.serverStart()
      `
      return this._writeFile('app.js', code, false)
    })
    .then(() => {
      var code = dedent`
        var assert = require('assert')

        var request = require('supertest')(require('../app').app)
        exports.request = request
      `
      return this._writeFile('test/test-utils.js', code, false)
    })
    .then(() => {
      this.emit('directory_changed')
    })
}
