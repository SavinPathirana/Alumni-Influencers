'use strict'

/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('node:fs');
var path = require('node:path');

/**
 * Auto-loader for controller subdirectories.
 * Scans the controllers/ directory for subfolders, each containing an index.js
 * that exports an Express Router. Mounts each router at /api/<folder-name>.
 * 
 * Adapted from the MVC boilerplate's lib/boot.js convention.
 */
module.exports = function(parent, options){
  var dir = path.join(__dirname, '..', 'controllers');
  var verbose = options.verbose;

  fs.readdirSync(dir).forEach(function(name){
    var file = path.join(dir, name);

    //Skip if it is not a directory
    if (!fs.statSync(file).isDirectory()) return;

    verbose && console.log('\n   %s:', name);

    //Require the controller's index.js which exports a Router
    var router = require(file);

    //Mount the router under /api/<controller-name>
    var mountPath = '/api/' + name;
    parent.use(mountPath, router);

    verbose && console.log('     mounted at %s', mountPath);
  });
};
