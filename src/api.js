var AWS = require('aws-sdk')
var _ = require('underscore')
var pync = require('pync')

import dedent from 'dedent'
import Backbeam from './'
import sanitize from './utils/sanitize'
import promisify from './utils/promisify'

Backbeam.prototype._findEndpoint = function(data, endpoint) {
  return data.api.endpoints.find(endp => {
    return endp.method === endpoint.method
        && endp.path === endpoint.path
  })
}

Backbeam.prototype.apiDeleteEndpoint = function(endpoint) {
  return Promise.resolve()
    .then(() => {
      endpoint = sanitize(endpoint, {
        method: 'string',
        path: 'string',
        functionName: 'string',
      })
    })
    .then(() => this.readConfig())
    .then(data => {
      var endpoints = data.api.endpoints
      var endp = this._findEndpoint(data, endpoint)
      if (!endp) return Promise.reject(new Error('Endpoint not found'))
      endpoints.splice(endpoints.indexOf(endp), 1)
      return this.writeConfig(data)
    })
    .then(() => this.emit('api_changed'))
}

Backbeam.prototype.apiEditEndpoint = function(endpoint, state) {
  return Promise.resolve()
    .then(() => {
      endpoint = sanitize(endpoint, {
        method: 'string',
        path: 'string',
        functionName: 'string',
      })
      state = sanitize(state, {
        method: 'string',
        path: 'string',
        functionName: 'string',
        input: 'string?',
        output: 'string?',
      })
    })
    .then(() => this.readConfig())
    .then(data => {
      var endpoints = data.api.endpoints
      var endp = this._findEndpoint(data, endpoint)
      var endp2 = this._findEndpoint(data, state)
      if (!endp) return Promise.reject(new Error('Endpoint not found'))
      if (endp2 && endp !== endp2) {
        return Promise.reject(new Error('An endpoint witht he same method and path already exists'))
      }
      Object.assign(endp, state)
      return this.writeConfig(data)
    })
    .then(() => this.emit('api_changed'))
}

Backbeam.prototype.apiCreateEndpoint = function(endpoint) {
  return Promise.resolve()
    .then(() => {
      endpoint = sanitize(endpoint, {
        method: 'string',
        path: 'string',
        functionName: 'string',
        input: 'string?',
        output: 'string?',
      })
    })
    .then(() => this.readConfig())
    .then((data) => {
      var endpoints = data.api.endpoints
      var endp = this._findEndpoint(data, endpoint)
      if (endp) {
        return Promise.reject(new Error('An endpoint witht he same method and path already exists'))
      }
      data.api.endpoints.push(endpoint)
      return this.writeConfig(data)
    })
    .then(() => this.emit('api_changed'))
}

Backbeam.prototype.apiList = function() {
  var apigateway = new AWS.APIGateway()
  return promisify(apigateway, 'getRestApis', {})
}

Backbeam.prototype.apiCreate = function(params) {
  var apigateway = new AWS.APIGateway()
  return promisify(apigateway, 'createRestApi', params)
}

Backbeam.prototype.apiSyncEndpoint = function(params, syncFunction) {
  var apigateway = new AWS.APIGateway()
  var method = params.method
  var path = params.path
  var api, func, endpoint, parentResource, resourceId

  var job = this._random()
  this.emit('job:start', { id: job, name: `Synching endpoint ${method} ${path}`, steps: 5 })

  return this.readConfig()
    .then((data) => {
      api = data.api
      endpoint = this._findEndpoint(data, params)
      if (!endpoint) return Promise.reject(new Error(`Endpoint not found ${method} ${path}`))

      func = this._findFunction(data, { functionName: endpoint.functionName })
      if (!func) return Promise.reject(new Error(`Lambda function not found ${endpoint.functionName}`))
      if (syncFunction) return this.lambdaSyncFunction(endpoint.functionName)
      if (!func.functionArn) return Promise.reject(new Error(`Lambda function not synched ${endpoint.functionName}`))
    })
    .then(() => {
      this.emit('job:progress', { id: job, log: `Creating API resources` })
      return promisify(apigateway, 'getResources', { restApiId: api.id })
    })
    .then((data) => {
      var resources = data.items
      resources.forEach(function(resource) {
        if (endpoint.path.indexOf(resource.path) === 0
          && (!parentResource || resource.path.length > parentResource.path.length)) {
            parentResource = resource
        }
      })
      var pathParts = _.compact(endpoint.path.substring(parentResource.path.length).split('/'))

      pync.series(pathParts, (part) => (
        promisify(apigateway, 'createResource', {
          restApiId: api.id,
          parentId: parentResource.id,
          pathPart: part,
        })
        .then((body) => {
          parentResource = body
        })
      ))
    })
    .then(() => {
      resourceId = parentResource.id
      var method = parentResource.resourceMethods && parentResource.resourceMethods[endpoint.method]
      if (method) {
        var params = {
          restApiId: api.id,
          resourceId: resourceId,
          httpMethod: endpoint.method,
        }
        console.log('deleteMethod')
        return promisify(apigateway, 'deleteMethod', params)
      } else {
        var params = {
          authorizationType: 'none',
          httpMethod: endpoint.method,
          resourceId: resourceId,
          restApiId: api.id,
          apiKeyRequired: false,
        }
        return promisify(apigateway, 'putMethod', params)
      }
    })
    .then(() => {
      this.emit('job:progress', { id: job, log: `Creating integration` })
      var params = {
        restApiId: api.id,
        resourceId: resourceId,
        httpMethod: endpoint.method,
        integrationHttpMethod: 'POST', // always POST?
        type: 'AWS',
        uri: `arn:aws:apigateway:${AWS.config.region}:lambda:path/2015-03-31/functions/${func.functionArn}/invocations`,
        requestTemplates: {
          'application/json': dedent`
            {
              "querystring" : {
              #foreach($key in $input.params().querystring.keySet())
                #if($foreach.index > 0), #end
                "$util.escapeJavaScript($key)": "$util.escapeJavaScript($input.params().querystring.get($key))"
              #end
              },
              "header" : {
              #foreach($key in $input.params().header.keySet())
                #if($foreach.index > 0), #end
                "$util.escapeJavaScript($key)": "$util.escapeJavaScript($input.params().header.get($key))"
              #end
              },
              "path" : {
              #foreach($key in $input.params().path.keySet())
                #if($foreach.index > 0), #end
                "$util.escapeJavaScript($key)": "$util.escapeJavaScript($input.params().path.get($key))"
              #end
              },
              "body" : $input.json('$')
            }
          `
        },
      }
      return promisify(apigateway, 'putIntegration', params)
    })
    .then(() => {
      this.emit('job:progress', { id: job, log: `Creating integration response` })
      var params = {
        httpMethod: endpoint.method,
        resourceId: resourceId,
        restApiId: api.id,
        statusCode: '200',
        responseParameters: {},
        responseTemplates: {},
        selectionPattern: '.*',
      }
      if (endpoint.output === 'html') {
        params.responseTemplates['text/html'] = '$input.path(\'$.html\')'
      }
      return promisify(apigateway, 'putIntegrationResponse', params)
    })
    .then(() => {
      this.emit('job:progress', { id: job, log: `Creating method response` })
      var params = {
        httpMethod: endpoint.method,
        resourceId: resourceId,
        restApiId: api.id,
        statusCode: '200',
        responseModels: {},
        responseParameters: {},
      }
      if (endpoint.output === 'html') {
        params.responseModels['text/html'] = 'Empty'
      }
      return promisify(apigateway, 'putMethodResponse', params)
    })
    .then(() => {
      this.emit('job:succees', { id: job })
    })
    .catch((e) => {
      this.emit('job:fail', { id: job, error: e })
      return Promise.reject(e)
    })
}

Backbeam.prototype.apiListStages = function() {
  var apigateway = new AWS.APIGateway()
  return this.readConfig()
    .then((data) => promisify(apigateway, 'getStages', { restApiId: data.api.id }))
}

Backbeam.prototype.apiCreateStage = function(params) {
  var apigateway = new AWS.APIGateway()
  return this.readConfig()
    .then((data) => {
      var options = {
        restApiId: data.api.id,
        stageName: params.name,
      }
      return promisify(apigateway, 'createDeployment', options)
    })
}
