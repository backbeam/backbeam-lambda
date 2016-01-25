var uuid = require('node-uuid')
var AWS = require('aws-sdk')

import Backbeam from './'
import promisify from './utils/promisify'
import sanitize from './utils/sanitize'

function sanitizeParams(params) {
  return sanitize(params, {
    name: 'string',
    hashKeyName: 'string',
    hashKeyType: 'string',
    rangeKeyName: 'string',
    rangeKeyType: 'string',
    readCapacity: 'number',
    writeCapacity: 'number',
    localIndexes: 'array',
    globalIndexes: 'array',
  })
  params.localIndexes = params.localIndexes.map((index) => (
    sanitize(index, {
      name: 'string',
      rangeKeyName: 'string',
      rangeKeyType: 'string',
    })
  ))
  params.globalIndexes = params.globalIndexes.map((index) => (
    sanitize(index, {
      name: 'string',
      hashKeyName: 'string',
      hashKeyType: 'string',
      rangeKeyName: 'string',
      rangeKeyType: 'string',
      readCapacity: 'number',
      writeCapacity: 'number',
    })
  ))
}

Backbeam.prototype._findTable = function(data, params) {
  return data.dynamo.tables.find(table => {
    return table.name === params.name
  })
}

Backbeam.prototype.dynamoCreateTable = function(params) {
  return Promise.resolve()
    .then(() => {
      params = sanitizeParams(params)
      return this.readConfig()
    })
    .then(data => {
      var table = this._findTable(data, params)
      if (table) {
        return Promise.reject(new Error(`A table named ${params.name} already exists`))
      }
      var tables = data.dynamo.tables
      tables.push(params)
      return this.writeConfig(data)
    })
    .then(() => this.emit('dynamo_changed'))
}

Backbeam.prototype.dynamoEditTable = function(params) {
  return Promise.resolve()
    .then(() => {
      params = sanitizeParams(params)
      return this.readConfig()
    })
    .then(data => {
      var tables = data.dynamo.tables
      var table = this._findTable(data, params)
      if (!table) {
        return Promise.reject(new Error(`No table named ${params.name} found`))
      }
      Object.assign(table, params)
      return this.writeConfig(data)
    })
    .then(() => this.emit('dynamo_changed'))
}

Backbeam.prototype.dynamoDeleteTable = function(params) {
  return this.readConfig()
    .then(data => {
      var tables = data.dynamo.tables
      var table = this._findTable(data, params)
      if (!table) {
        return Promise.reject(new Error(`No table named ${params.functionName} found`))
      }
      tables.splice(tables.indexOf(table), 1)
      return this.writeConfig(data)
    })
    .then(() => this.emit('dynamo_changed'))
}
