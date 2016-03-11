var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

var path = require('path')
var Backbeam = require('../lib').default
var backbeam = new Backbeam()

exports.testAppDir = function () {
  return path.join(__dirname, 'test-app')
}

exports.createAppDir = function () {
  const dir = exports.testAppDir()
  rimraf.sync(dir)
  mkdirp.sync(dir)
  return dir
}

exports.backbeam = function () {
  return backbeam
}

exports.init = function () {
  const dir = exports.createAppDir()

  var params = {
    region: backbeam.availableRegions()[0],
    api: {
      id: 'o9kvzup3g2',
      name: 'API name',
      description: 'API description',
      role: 'arn:aws:iam::551937714682:role/lambda_dynamo'
    },
    role: 'role-id-1234'
  }
  return backbeam.init(dir, params)
}
