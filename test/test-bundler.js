var assert = require('assert')
var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var utils = require('./utils')
var pify = require('pify')
var exec = pify(require('child_process').exec, { multiArgs: true })

import bundler from '../lib/bundler'

const dir = utils.createAppDir()
const input = path.join(dir, 'input.js')
const output = path.join(dir, 'output.js')
const lib = path.join(dir, 'node_modules/my_lib/index.js')

describe('Bundler', () => {

  before(() => {
    mkdirp.sync(path.join(dir, 'node_modules'))
    mkdirp.sync(path.join(dir, 'node_modules/my_lib'))
    fs.writeFileSync(lib, `
      exports.sayHello = function(word) {
        return 'hello '+word
      }
    `)
  })

  it('should bundle a file and its dependencies', () => {
    const handler = 'handler'
    fs.writeFileSync(input, `
      var aws = require('aws-sdk')
      var lib = require('my_lib')

      exports.${handler} = function(word) {
        console.log(lib.sayHello(word))
      }
    `)

    return bundler(input, output)
      .then((stats) => {
        assert.ok(stats.compilation.fullHash)
        assert.deepEqual(stats.compilation.fileDependencies, [input, lib])
        assert.ok(stats.compilation.assets['output.js'])
        return exec(`node -e "require('${output}').${handler}('world')"`)
          .then((result) => {
            const [stdout, stderr] = result
            assert.equal(stderr, '')
            assert.equal(stdout, 'hello world\n')
          })
      })
  })

})
