'use strict'

var express = require('express');
var fs = require('node:fs');
var path = require('node:path');

module.exports = function (parent, options) {
  var dir = path.join(__dirname, '..', 'controllers');
  var verbose = options.verbose;

  fs.readdirSync(dir).forEach(function (name) {
    var file = path.join(dir, name);

    //Skip if it is not a directory
    if (!fs.statSync(file).isDirectory()) return;

    verbose && console.log('\n   %s:', name);

    //Require the controller's index.js
    var router = require(file);

    //Mount the router
    var mountPath = '/api/' + name;
    parent.use(mountPath, router);

    verbose && console.log('     mounted at %s', mountPath);
  });
};
