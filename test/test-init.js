/* global describe it */
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var assert = require('assert')

var Backbeam = require('../lib').default
var backbeam = new Backbeam()

describe('Backbeam.init()', () => {
  var dir = path.join(__dirname, 'test-app')
  rimraf.sync(dir)
  mkdirp.sync(dir)

  it('#init', () => {
    var params = {
      region: backbeam.availableRegions()[0],
      api: {
        id: 'api-id-1234',
        name: 'API name',
        description: 'API description'
      },
      role: 'role-id-1234'
    }
    return backbeam.init(dir, params)
      .then(() => {
        return backbeam.readConfig()
      })
      .then((data) => {
        assert.deepEqual(data, {
          'project': 'test-app',
          'region': 'us-east-1',
          'api': {
            'stage': null,
            'endpoints': [],
            'id': 'o9kvzup3g2',
            'name': 'API name',
            'description': 'API description'
          },
          'lambda': {
            'defaults': {
              'role': 'role-id-1234',
              'timeout': 60,
              'memory': 128
            },
            'functions': []
          },
          'dynamo': {
            'tables': []
          }
        })
      })
      .then(() => {
        assert.ok(fs.existsSync(path.join(dir, 'backbeam.json')))
        assert.ok(fs.existsSync(path.join(dir, 'app.js')))
        assert.ok(fs.existsSync(path.join(dir, 'dynamo.js')))
        assert.ok(fs.existsSync(path.join(dir, 'test/test-utils.js')))
      })
  })
})
