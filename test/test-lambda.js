var utils = require('./utils')
var backbeam = utils.backbeam()
var assert = require('assert')

require('./aws-mock')

describe('Lambda methods', () => {

  before(() => utils.init())

  it('#lambdaCreateFunction', () => {
    var params = {
      functionName: 'testFunction',
      filename: 'functions/testFunction.js',
      handler: 'run',
      role: 'arn:aws:iam::551937714682:role/lambda_dynamo',
      memory: 128,
      timeout: 3
    }
    return backbeam.lambdaCreateFunction(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var func = backbeam._findFunction(data, params)
        assert.deepEqual(func, {
          "functionName": "testFunction",
          "filename": "functions/testFunction.js",
          "handler": "run",
          "role": "arn:aws:iam::551937714682:role/lambda_dynamo",
          "memory": 128,
          "timeout": 3
        })
      })
  })

  it('#lambdaEditFunction', () => {
    var params = {
      functionName: 'testFunction',
      filename: 'functions/testFunction.js',
      handler: 'run',
      role: 'arn:aws:iam::551937714682:role/lambda_dynamo',
      memory: 256,
      timeout: 3
    }
    return backbeam.lambdaEditFunction(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var func = backbeam._findFunction(data, params)
        assert.deepEqual(func, {
          "functionName": "testFunction",
          "filename": "functions/testFunction.js",
          "handler": "run",
          "role": "arn:aws:iam::551937714682:role/lambda_dynamo",
          "memory": 256,
          "timeout": 3
        })
      })
  })

  it('#lambdaSyncFunction', () => {
    return backbeam.lambdaSyncFunction('testFunction')
      .then(() => backbeam.readConfig())
      .then((data) => {
        var func = backbeam._findFunction(data, { functionName: 'testFunction' })
        assert.ok(func)
        assert.ok(func.hash)
        assert.ok(func.functionArn)
      })
  })

  it('#lambdaSyncFunction updating an existing one', () => {
    return backbeam.lambdaSyncFunction('testFunction')
      .then(() => backbeam.readConfig())
      .then((data) => {
        var func = backbeam._findFunction(data, { functionName: 'testFunction' })
        assert.ok(func)
        assert.ok(func.hash)
        assert.ok(func.functionArn)
      })
  })

  it('Lambda and API integration', () => {
    var params = {
      method: 'PUT',
      path: '/test',
      functionName: 'testFunction',
    }
    return backbeam.apiCreateEndpoint(params)
      .then(() => backbeam.apiSyncEndpoint(params))
  })

  it('Lambda and API integration with HTML', () => {
    var params = {
      method: 'POST',
      path: '/test',
      functionName: 'testFunction',
      input: 'html',
      output: 'html',
    }
    return backbeam.apiCreateEndpoint(params)
      .then(() => backbeam.apiSyncEndpoint(params))
  })

})
