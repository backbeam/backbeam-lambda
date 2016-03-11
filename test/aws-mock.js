var AWS = require('aws-sdk')

var APIGateway = AWS.APIGateway
AWS.APIGateway = function () {
  var obj = new APIGateway()

  obj.getRestApis = function (params, callback) {
    callback(null, {
      'items': [
        {
          'id': 'o9kvzup3g2',
          'name': 'test2',
          'description': 'this is a test',
          'createdDate': '2015-12-16T18:45:15.000Z'
        }
      ]
    })
  }

  obj.createDeployment = function (params, callback) {
    callback(null, {
      id: 'l4nono',
      createdDate: '2015-12-16T18:45:15.000Z'
    })
  }

  obj.getStages = function (params, callback) {
    callback(null, {
      item: [
        {
          deploymentId: 'l4nono',
          stageName: 'dev',
          cacheClusterEnabled: false,
          cacheClusterStatus: 'NOT_AVAILABLE',
          methodSettings: {},
          createdDate: '2015-12-16T18:45:15.000Z',
          lastUpdatedDate: '2015-12-16T18:45:15.000Z'
        }
      ]})
  }

  obj.getResources = function (params, callback) {
    callback(null, {
      'items': [
        {
          'id': 'et8yke',
          'parentId': 'n8lbb78g76',
          'pathPart': 'test',
          'path': '/test'
        },
        {
          'id': 'n8lbb78g76',
          'path': '/',
          'resourceMethods': {
            'GET': {},
            'POST': {}
          }
        }
      ]
    })
  }

  obj.putMethod = function (params, callback) {
    callback(null, {
      'httpMethod': 'POST',
      'authorizationType': 'NONE',
      'apiKeyRequired': false
    })
  }

  obj.createResource = function (params, callback) {
    callback(null, {
      'id': 'et8yke',
      'parentId': 'n8lbb78g76',
      'pathPart': 'test',
      'path': '/test'
    })
  }

  obj.putIntegration = function (params, callback) {
    callback(null, {
      'type': 'AWS',
      'httpMethod': 'POST',
      'uri': 'arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:551937714682:function:testFunction/invocations',
      'requestTemplates': {
        'application/json': '{\n  "querystring" : {\n  #foreach($key in $input.params().querystring.keySet())\n    #if($foreach.index > 0), #end\n    "$util.escapeJavaScript($key)": "$util.escapeJavaScript($input.params().querystring.get($key))"\n  #end\n  },\n  "header" : {\n  #foreach($key in $input.params().header.keySet())\n    #if($foreach.index > 0), #end\n    "$util.escapeJavaScript($key)": "$util.escapeJavaScript($input.params().header.get($key))"\n  #end\n  },\n  "path" : {\n  #foreach($key in $input.params().path.keySet())\n    #if($foreach.index > 0), #end\n    "$util.escapeJavaScript($key)": "$util.escapeJavaScript($input.params().path.get($key))"\n  #end\n  },\n  "body" : $input.json(\'$\')\n}'
      },
      'cacheNamespace': 'n8lbb78g76',
      'cacheKeyParameters': []
    })
  }

  obj.putIntegrationResponse = function (params, callback) {
    callback(null, {
      'statusCode': '200',
      'selectionPattern': '.*',
      'responseParameters': {},
      'responseTemplates': {}
    })
  }

  obj.putMethodResponse = function (params, callback) {
    callback(null, {
      'statusCode': '200',
      'responseParameters': {},
      'responseModels': {}
    })
  }

  // obj.createRestApi = function(params, callback) {
  //
  // }

  return obj
}

var IAM = AWS.IAM
AWS.IAM = function () {
  var obj = new IAM()

  obj.listRoles = function (callback) {
    callback(null, {
      'ResponseMetadata': {
        'RequestId': '578b9c46-c352-11e5-a92d-cb5f21fe3353'
      },
      'Roles': [
        {
          'Path': '/',
          'RoleName': 'lambda_dynamo',
          'RoleId': 'RROAIARHBGRXWOH6BQHSM',
          'Arn': 'arn:aws:iam::551937714682:role/lambda_dynamo',
          'CreateDate': '2016-01-19T18:30:49.000Z',
          'AssumeRolePolicyDocument': '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22lambda.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D'
        }
      ]
    })
  }

  obj.createRole = function (params, callback) {
    callback(null, {
      'ResponseMetadata': {
        'RequestId': '4369fef8-c353-11e5-a8d3-0f8f31dffa74'
      },
      'Role': {
        'Path': '/',
        'RoleName': 'lambda_dynamo2',
        'RoleId': 'RROAI7EMUBAUGAASLFKVC',
        'Arn': 'arn:aws:iam::551937714682:role/lambda_dynamo2',
        'CreateDate': '2016-01-25T11:03:28.684Z',
        'AssumeRolePolicyDocument': '%7B%22Version%22%3A%222012-10-17%22%2C%22Statement%22%3A%5B%7B%22Sid%22%3A%22%22%2C%22Effect%22%3A%22Allow%22%2C%22Principal%22%3A%7B%22Service%22%3A%22lambda.amazonaws.com%22%7D%2C%22Action%22%3A%22sts%3AAssumeRole%22%7D%5D%7D'
      }
    })
  }

  return obj
}

var Lambda = AWS.Lambda
AWS.Lambda = function () {
  var obj = new Lambda()

  obj.createFunction = function (params, callback) {
    callback(null, {
      'FunctionName': 'testFunction',
      'FunctionArn': 'arn:aws:lambda:us-east-1:551937714682:function:testFunction',
      'Runtime': 'nodejs',
      'Role': 'arn:aws:iam::551937714682:role/lambda_dynamo',
      'Handler': 'index.run',
      'CodeSize': 123141,
      'Description': '',
      'Timeout': 3,
      'MemorySize': 256,
      'LastModified': '2016-01-25T11:26:18.574+0000',
      'CodeSha256': 'Y5KAYRYkYV4EUjZNpUcULXeiJWgRB5wGUjXq6XeIO9Y=',
      'Version': '$LATEST'
    })
  }

  obj.addPermission = function (params, callback) {
    callback(null, {
      'Statement': '{"Action":["lambda:InvokeFunction"],"Resource":"arn:aws:lambda:us-east-1:551937714682:function:testFunction","Effect":"Allow","Principal":{"Service":"apigateway.amazonaws.com"},"Sid":"3ccda8e0-d2ec-43a3-b20e-8242ff270da1"}'
    })
  }

  obj.updateFunctionCode = function (params, callback) {
    callback(null, {
      'FunctionName': 'testFunction',
      'FunctionArn': 'arn:aws:lambda:us-east-1:551937714682:function:testFunction',
      'Runtime': 'nodejs',
      'Role': 'arn:aws:iam::551937714682:role/lambda_dynamo',
      'Handler': 'index.handler',
      'CodeSize': 123141,
      'Description': '',
      'Timeout': 3,
      'MemorySize': 256,
      'LastModified': '2016-01-25T11:42:20.895+0000',
      'CodeSha256': 'cXmXSL2lJgpfhoYdrPd6g0BV0Z0G8qCPadUGqEOWNcU=',
      'Version': '$LATEST'
    })
  }

  obj.updateFunctionConfiguration = function (params, callback) {
    callback(null, {
      'FunctionName': 'testFunction',
      'FunctionArn': 'arn:aws:lambda:us-east-1:551937714682:function:testFunction',
      'Runtime': 'nodejs',
      'Role': 'arn:aws:iam::551937714682:role/lambda_dynamo',
      'Handler': 'index.handler',
      'CodeSize': 123141,
      'Description': '',
      'Timeout': 3,
      'MemorySize': 256,
      'LastModified': '2016-01-25T11:42:21.663+0000',
      'CodeSha256': 'cXmXSL2lJgpfhoYdrPd6g0BV0Z0G8qCPadUGqEOWNcU=',
      'Version': '$LATEST'
    })
  }

  return obj
}
