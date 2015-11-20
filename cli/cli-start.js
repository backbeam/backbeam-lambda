var express = require('express')
var http = require('http')

module.exports = function(yargs) {
  var argv = yargs.options({
    'port': {
      alias: 'p',
      default: process.env.PORT || 3000,
      describe: 'HTTP server port',
      type: 'number',
    }
  })
  .wrap(yargs.terminalWidth())
  .help('help')
  .argv

  var port = argv.port
  var app = express()
  http.createServer(app).listen(port)
  console.log('Started server at port %d', port)
}
