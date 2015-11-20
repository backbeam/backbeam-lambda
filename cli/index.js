#!/usr/bin/env node

var colors = require('colors')
var util = require('util')
var fs = require('fs')
var path = require('path')
var _ = require('underscore')

var commands = {
  'controllers': 'Handles web controllers: labmda functions and their API resources',
  'api': 'Handles basic API functionality with AWS',
  'region': 'Use these commands to select an AWS region',
  'init': 'Creates a structure for a new project',
  'stage': 'Use these commands to select or create AWS API stages',
  'role': 'Handles IAM roles',
  'start': 'Start the development server',
}

var yargs = require('yargs').usage('Usage: $0').help('help')
yargs.wrap(yargs.terminalWidth())

_.keys(commands).forEach(function(command) {
  yargs.command(command, commands[command], require('./cli-'+command))
})

yargs.argv
