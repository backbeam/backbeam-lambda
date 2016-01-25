#!/usr/bin/env node
import Backbeam from '../'

var yargs = require('yargs').usage('Usage: $0').help('help')
yargs.wrap(yargs.terminalWidth())

yargs.command('server', 'Start the development server', function(yargs) {
  var backbeam = new Backbeam(process.cwd())
  backbeam.serverStart()
  console.log('Started server at port 3333')
})

yargs.argv
