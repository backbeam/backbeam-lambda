var pify = require('pify')

export default function(obj, method, ...args) {
  return pify(obj[method].bind(obj)).apply(null, args)
}
