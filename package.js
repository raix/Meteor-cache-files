Package.describe({
  name: 'raix:cached-files',
  version: "0.0.1",
  summary: "Cache files",
  git: "https://github.com/GroundMeteor/cached-files.git"
});

Cordova.depends({
  "org.apache.cordova.file": "1.3.1",
  "org.apache.cordova.file-transfer": "0.4.6"
});

Package.on_use(function (api) {

  api.export('CachedFile');

  api.versionsFrom('METEOR@0.9.4');
  if (api.versionsFrom) {

    api.use('meteor-platform', ['client', 'server']);

    api.use([
      'meteor',
      'underscore',
      'ejson',
      'mongo',
      'ground:localstorage@0.0.2',
      ], ['client', 'server']);

    api.use(['tracker'], 'client');

  }

  api.add_files([
    'scope.js',
  ], 'client');

  api.add_files([
    'browser.api.js',
  ], 'web.browser');

  api.add_files([
    'cordova.api.js',
  ], 'web.cordova');

  api.add_files([
    'local.collection.js',
    'cached-files.js',
  ], 'client');

});

Package.on_test(function (api) {
  api.use('raix:cached-files', ['client']);

  api.use('test-helpers', 'client');
  api.use(['tinytest', 'underscore', 'ejson']);

  api.add_files('cached-files.tests.js', 'client');

});
