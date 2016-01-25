export default function(obj, validations) {
  var copy = {}
  Object.keys(validations).forEach((key) => {
    let value = obj[key]
    let validation = validations[key]
    var optional = false
    if (validation.substring(validation.length-1) === '?') {
      if (value == null) {
        return
      }
      validation = validation.substring(validation.length-1)
      optional = true
    }

    if (validation === 'string') {
      if (typeof value !== 'string') {
        throw new Error(`${key} must be a string`)
      }
      value = value.trim()
      if (!optional && value.length === 0) {
        throw new Error(`${key} must be a string`)
      }
    } else if (validation === 'number') {
      if (typeof value !== 'number') {
        throw new Error(`${key} must be a number`)
      }
    } else if (validation === 'object') {
      if (typeof value !== 'object') {
        throw new Error(`${key} must be an object`)
      }
      if (!optional && value == null) {
        throw new Error(`${key} must be an object`)
      }
    } else if (validation === 'array') {
      if (!Array.isArray(value)) {
        throw new Error(`${key} must be a number`)
      }
    }
    copy[key] = value
  })

  return copy
}
