/* global Cordova */

Package.describe({
  name: 'raix:cached-files',
  version: "0.0.2",
  summary: "Cache files",
  git: "https://github.com/GroundMeteor/cached-files.git"
});

Cordova.depends({
  "org.apache.cordova.file": "1.3.1",
  "org.apache.cordova.file-transfer": "0.4.6"
});

Package.onUse(function (api) {

  api.export('CachedFile');

  api.versionsFrom('METEOR@1.0');

  api.use([
    'meteor-platform',
    'meteor',
    'underscore',
    'ejson',
    'mongo',
    'ground:localstorage@0.0.2',
    ], ['client', 'server']);

  api.use(['tracker'], 'client');

  api.addFiles([
    'scope.js',
  ], 'client');

  api.addFiles([
    'browser.api.js',
  ], 'web.browser');

  api.addFiles([
    'cordova.api.js',
  ], 'web.cordova');

  api.addFiles([
    'local.collection.js',
    'cached-files.js',
  ], 'client');

});

Package.onTest(function (api) {
  api.use('raix:cached-files', ['client']);

  api.use('test-helpers', 'client');
  api.use(['tinytest', 'underscore', 'ejson']);

  api.addFiles('cached-files.tests.js', 'client');

});
