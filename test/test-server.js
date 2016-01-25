var utils = require('./utils')
var backbeam = utils.backbeam()
var assert = require('assert')
var request = require('supertest')

require('./aws-mock')

var app

describe('Dev server', () => {

  before(() => {
    app = backbeam.serverStart()
    return utils.init()
  })

  it('Simple JSON endpoint', () => {
    return Promise.resolve()
      .then(() => {
        var params = {
          functionName: 'testFunction',
          filename: 'functions/testFunction.js',
          handler: 'run',
          role: 'arn:aws:iam::551937714682:role/lambda_dynamo',
          memory: 128,
          timeout: 3
        }
        return backbeam.lambdaCreateFunction(params)
      })
      .then(() => {
        var params = {
          method: 'GET',
          path: '/',
          functionName: 'testFunction',
        }
        return backbeam.apiCreateEndpoint(params)
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          request(app)
            .get('/')
            .expect(200)
            .end(function(err, res) {
              if (err) return reject(err)
              assert.deepEqual(res.body, { message: 'hello world' })
              resolve()
            })
        })
      })
  })

})
