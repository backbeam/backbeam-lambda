var path = require('path')
var pify = require('pify')
var webpack = pify(require('webpack'))

export default function(input, output) {
  return webpack({
    entry: [input],
    output: {
      path: path.dirname(output),
      filename: path.basename(output),
      libraryTarget: 'commonjs2',
    },
    target: 'node',
    externals: {
      'aws-sdk': 'commonjs aws-sdk',
    },
    module: {
      loaders: [
        {
          test: '.js',
          loaders: ['babel'],
          query: {
            presets: ['es2015']
          }
        }
      ]
    }
  })
}
