var AWS = require('aws-sdk')

import Backbeam from './'
import promisify from './utils/promisify'
import sanitize from './utils/sanitize'

function sanitizeParams (params) {
  var copy = sanitize(params, {
    name: 'string',
    hashKeyName: 'string',
    hashKeyType: 'string',
    rangeKeyName: 'string?',
    rangeKeyType: 'string?',
    readCapacity: 'number',
    writeCapacity: 'number',
    localIndexes: 'array',
    globalIndexes: 'array'
  })
  params.localIndexes = params.localIndexes.map((index) => (
    sanitize(index, {
      name: 'string',
      rangeKeyName: 'string',
      rangeKeyType: 'string'
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
      writeCapacity: 'number'
    })
  ))
  return copy
}

Backbeam.prototype._findTable = function (data, params) {
  return data.dynamo.tables.find((table) => {
    return table.name === params.name
  })
}

Backbeam.prototype.dynamoCreateTable = function (params) {
  return Promise.resolve()
    .then(() => {
      params = sanitizeParams(params)
      return this.readConfig()
    })
    .then((data) => {
      var table = this._findTable(data, params)
      if (table) {
        return Promise.reject(new Error(`A table named ${params.name} already exists`))
      }
      data.dynamo.tables.push(params)
      return this.writeConfig(data)
    })
    .then(() => this.emit('dynamo_changed'))
    .then(() => this.dynamoSyncTable(params, this.localDynamo()))
}

Backbeam.prototype.dynamoEditTable = function (params) {
  var table
  return Promise.resolve()
    .then(() => {
      params = sanitizeParams(params)
      return this.readConfig()
    })
    .then((data) => {
      table = this._findTable(data, params)
      if (!table) {
        return Promise.reject(new Error(`No table named ${params.name} found`))
      }
      Object.assign(table, params)
      return this.writeConfig(data)
    })
    .then(() => {
      this.emit('dynamo_changed')
      this.dynamoSyncTable(table, this.localDynamo())
    })
}

Backbeam.prototype.dynamoDeleteTable = function (params) {
  return this.readConfig()
    .then((data) => {
      var tables = data.dynamo.tables
      var table = this._findTable(data, params)
      if (!table) {
        return Promise.reject(new Error(`No table named ${params.functionName} found`))
      }
      tables.splice(tables.indexOf(table), 1)
      return this.writeConfig(data)
    })
    .then(() => {
      this.emit('dynamo_changed')
      this._dynamoDeleteTable(params.name, this.localDynamo())
    })
}

Backbeam.prototype.localDynamo = function () {
  if (!this._localDynamo) {
    this._localDynamo = new AWS.DynamoDB({
      endpoint: 'http://localhost:4567',
      region: 'local'
    })
  }
  return this._localDynamo
}

Backbeam.prototype.remoteDynamo = function () {
  if (!this._remoteDynamo || this._remoteDynamoRegion !== this.getRegion()) {
    this._remoteDynamoRegion = this.getRegion()
    this._remoteDynamo = new AWS.DynamoDB({
      region: this.getRegion()
    })
  }
  return this._remoteDynamo
}

Backbeam.prototype._dynamoDescribeTable = function (tableName, dynamo) {
  return new Promise((resolve, reject) => {
    dynamo.describeTable({ TableName: tableName }, (err, data) => {
      err && err.code !== 'ResourceNotFoundException' ? reject(err) : resolve(data && data.Table)
    })
  })
}

Backbeam.prototype._dynamoDeleteTable = function (tableName, dynamo) {
  return new Promise((resolve, reject) => {
    dynamo.describeTable({ TableName: tableName }, (err, data) => {
      err && err.code !== 'ResourceNotFoundException' ? reject(err) : resolve(data)
    })
  })
}

Backbeam.prototype.dynamoSyncTable = function (table, dynamo, currentJob) {
  var job = this._job(`Synching dynamo table ${table.name}`, 1, currentJob)
  return job.run(this._dynamoDescribeTable(table.name, dynamo)
    .then((oldTable) => {
      var params = this._dynamoEditTableParams(table, oldTable)
      if (params) return promisify(dynamo, oldTable ? 'updateTable' : 'createTable', params)
    }))
}

Backbeam.prototype._dynamoEditTableParams = function (table, oldTable) {
  var params = {
    'TableName': table.name,
    'AttributeDefinitions': []
  }

  function appendAttribute (name, type) {
    var attr = params.AttributeDefinitions.find((attr) => attr.AttributeName === name)
    if (attr) return
    params.AttributeDefinitions.push({
      'AttributeName': name,
      'AttributeType': type.substring(0, 1).toUpperCase()
    })
  }

  if (!oldTable) {
    params.KeySchema = [{
      'AttributeName': table.hashKeyName,
      'KeyType': 'HASH'
    }]
    appendAttribute(table.hashKeyName, table.hashKeyType)

    if (table.rangeKeyName) {
      appendAttribute(table.rangeKeyName, table.rangeKeyType)
      params.KeySchema.push({
        'AttributeName': table.rangeKeyName,
        'KeyType': 'RANGE'
      })
    }
  }

  var oldIndexes = (oldTable && oldTable.GlobalSecondaryIndexes) || []
  var arr = table.globalIndexes.map((index) => {
    var oldIndex = oldIndexes.find((ind) => ind.IndexName === index.name)
    if (oldIndex &&
        oldIndex.ProvisionedThroughput.ReadCapacityUnits === index.readCapacity &&
        oldIndex.ProvisionedThroughput.WriteCapacityUnits === index.writeCapacity) {
      return null
    }

    var obj = {
      'IndexName': index.name,
      'ProvisionedThroughput': {
        'ReadCapacityUnits': index.readCapacity,
        'WriteCapacityUnits': index.writeCapacity
      }
    }
    if (!oldIndex) {
      appendAttribute(index.hashKeyName, index.hashKeyType)
      obj.KeySchema = [{
        'AttributeName': index.hashKeyName,
        'KeyType': 'HASH'
      }]
      if (index.rangeKeyName) {
        appendAttribute(index.rangeKeyName, index.rangeKeyType)
        obj.KeySchema.push({
          'AttributeName': index.rangeKeyName,
          'KeyType': 'RANGE'
        })
      }
      obj.Projection = {
        'ProjectionType': 'ALL'
      }
    }
    if (oldTable) {
      if (oldIndex) {
        obj = { Update: obj }
      } else {
        obj = { Create: obj }
      }
    }
    return obj
  }).filter((index) => index)

  if (oldTable) {
    arr = arr.concat(oldIndexes
      .filter((index) => !table.globalIndexes.find((ind) => ind.name === index.IndexName))
      .map((index) => ({
        Delete: {
          IndexName: index.IndexName
        }
      })
    ))
  }

  if (arr.length > 0) {
    params[oldTable ? 'GlobalSecondaryIndexUpdates' : 'GlobalSecondaryIndexes'] = arr
  }

  if (!oldTable && table.localIndexes.length > 0) {
    params.LocalSecondaryIndexes = table.localIndexes.map((index) => {
      appendAttribute(index.rangeKeyName, index.rangeKeyType)
      return {
        'IndexName': index.name,
        'KeySchema': [
          {
            'AttributeName': index.rangeKeyName,
            'KeyType': 'HASH'
          }
        ],
        'Projection': {
          'ProjectionType': 'ALL'
        }
      }
    })
  }

  if (!oldTable ||
    table.readCapacity !== oldTable.ProvisionedThroughput.ReadCapacityUnits ||
    table.writeCapacity !== oldTable.ProvisionedThroughput.WriteCapacityUnits) {
    params.ProvisionedThroughput = {
      'ReadCapacityUnits': table.readCapacity,
      'WriteCapacityUnits': table.writeCapacity
    }
  }

  if (oldTable) {
    if (!params.ProvisionedThroughput ||
      !params.GlobalSecondaryIndexUpdates ||
      !params.StreamSpecification) {
      return null
    }
  }

  return params
}
