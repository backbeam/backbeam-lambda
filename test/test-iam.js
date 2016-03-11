/* global describe it before */
var utils = require('./utils')
var backbeam = utils.backbeam()
var assert = require('assert')

require('./aws-mock')

describe('IAM methods', () => {
  before(() => utils.init())

  it('#iamListRoles', () => {
    return backbeam.iamListRoles()
      .then((data) => assert.ok(data))
  })

  it('#iamCreateRole', () => {
    return backbeam.iamCreateRole({ name: 'lambda_dynamo2' })
      .then((data) => assert.ok(data))
  })
})
