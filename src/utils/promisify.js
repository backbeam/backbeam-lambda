var pify = require('pify')

export default function(obj, method, ...args) {
  if (obj == null) {
    return Promise.reject(new Error(`Cannot promisify. Object is null or indefined`))
  }
  if (!obj[method]) {
    const methods = Object.keys(obj).filter((key) => typeof obj[key] === 'function')
    return Promise.reject(new Error(`Cannot promisify. Method not found. Use ${methods.join(', ')}`))
  }
  return pify(obj[method].bind(obj)).apply(null, args)
}
