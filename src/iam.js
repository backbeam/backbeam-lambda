var AWS = require('aws-sdk')

import Backbeam from './'
import promisify from './utils/promisify'

Backbeam.prototype.iamListRoles = function () {
  var iam = new AWS.IAM()
  return promisify(iam, 'listRoles')
}

Backbeam.prototype.iamCreateRole = function (role) {
  var policyDocument = {
    'Version': '2012-10-17',
    'Statement': [
      {
        'Sid': '',
        'Effect': 'Allow',
        'Principal': {
          'Service': 'lambda.amazonaws.com'
        },
        'Action': 'sts:AssumeRole'
      }
    ]
  }
  var params = {
    RoleName: role.name,
    AssumeRolePolicyDocument: JSON.stringify(policyDocument)
  }
  var iam = new AWS.IAM()
  return promisify(iam, 'createRole', params)
}
