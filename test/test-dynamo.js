var utils = require('./utils')
var backbeam = utils.backbeam()
var assert = require('assert')

require('./aws-mock')

describe('Dynamo methods', () => {

  before(() => utils.init())

  it('#dynamoCreateTable', () => {
    var params = {
      name: 'users',
      hashKeyName: 'id',
      hashKeyType: 'string',
      rangeKeyName: 'created_at',
      rangeKeyType: 'number',
      readCapacity: 1,
      writeCapacity: 1,
      localIndexes: [],
      globalIndexes: [],
    }
    return backbeam.dynamoCreateTable(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var table = backbeam._findTable(data, params)
        assert.deepEqual(table, {
          "name": "users",
          "hashKeyName": "id",
          "hashKeyType": "string",
          "rangeKeyName": "created_at",
          "rangeKeyType": "number",
          "readCapacity": 1,
          "writeCapacity": 1,
          "localIndexes": [],
          "globalIndexes": []
        })
      })
  })

  it('#dynamoEditTable', () => {
    var params = {
      name: 'users',
      hashKeyName: 'id',
      hashKeyType: 'string',
      rangeKeyName: 'created_at',
      rangeKeyType: 'number',
      readCapacity: 2,
      writeCapacity: 2,
      localIndexes: [],
      globalIndexes: [],
    }
    return backbeam.dynamoEditTable(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var table = backbeam._findTable(data, params)
        assert.ok(table)
        assert.equal(table.readCapacity, 2)
        assert.equal(table.writeCapacity, 2)
      })
  })

  it('#dynamoDeleteTable', () => {
    var params = {
      name: 'users',
    }
    return backbeam.dynamoDeleteTable(params)
      .then(() => backbeam.readConfig())
      .then((data) => {
        var table = backbeam._findTable(data, params)
        assert.ok(!table)
      })
  })

})
