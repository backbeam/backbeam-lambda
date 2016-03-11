/* global describe it before */
var utils = require('./utils')
var backbeam = utils.backbeam()
var assert = require('assert')

require('./aws-mock')

describe('API methods', () => {
  before(() => utils.init())

  it('#apiCreateEndpoint', () => {
    var params = {
      method: 'POST',
      path: '/test',
      functionName: 'home'
    }
    return backbeam.apiCreateEndpoint(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var endpoint = backbeam._findEndpoint(data, params)
        assert.deepEqual(endpoint, {
          method: 'POST',
          path: '/test',
          functionName: 'home'
        })
      })
  })

  it('#apiCreateEndpoint fails if endpoint already exists', () => {
    var params = {
      method: 'POST',
      path: '/test',
      functionName: 'home'
    }
    return backbeam.apiCreateEndpoint(params)
      .then(() => Promise.reject('Should have failed to create endpoint'))
      .catch((err) => {
        assert.ok(err)
      })
  })

  it('#apiEditEndpoint', () => {
    var old = {
      method: 'POST',
      path: '/test',
      functionName: 'home'
    }
    var params = {
      method: 'PUT',
      path: '/test/foo',
      functionName: 'home'
    }
    return backbeam.apiEditEndpoint(old, params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var endpoint = backbeam._findEndpoint(data, params)
        assert.deepEqual(endpoint, {
          method: 'PUT',
          path: '/test/foo',
          functionName: 'home'
        })
        var oldend = backbeam._findEndpoint(data, old)
        assert.ok(!oldend)
      })
  })

  it('#apiList', () => {
    return backbeam.apiList()
      .then((result) => assert.ok(result))
  })

  it('#apiListStages', () => {
    return backbeam.apiListStages()
      .then((result) => assert.ok(result))
  })

  it('#apiCreateStage', () => {
    return backbeam.apiCreateStage({ name: 'dev' })
      .then((result) => assert.ok(result))
  })

  it('#apiDeleteEndpoint', () => {
    var params = {
      method: 'PUT',
      path: '/test/foo',
      functionName: 'home'
    }
    return backbeam.apiDeleteEndpoint(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var endpoint = backbeam._findEndpoint(data, params)
        assert.ok(!endpoint)
      })
  })
})
