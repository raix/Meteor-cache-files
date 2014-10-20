/*

  This file adds LocalCollection

  LocalCollection creates a local Mongo.Collection that's cached in localStorage

*/

// Localstorage collection prefix
var _localCollectionPrefix = '_localCollection';

LocalCollection = function(name) {

  // Cached collection
  var _cachedFilesCollection = new Mongo.Collection(name, { connection: null });

  // Pointer to store handler
  var _storeFilesCollection;

  var _isLoaded = false;

  _cachedFilesCollection.loadCache = function(callback) {

    // Load the stored database on startup
    try {
      // Get the data from localstorage
      var dataString = localStorage.getItem(_localCollectionPrefix + name);

      // Get the data into the collection
      if (dataString)
        _cachedFilesCollection._collection._docs._map = EJSON.parse(dataString);

      _isLoaded = true;

      // Invalidate the collection
      _cachedFilesCollection.invalidateDb();

    } catch(err) {
      console.warn('CachedFile not loaded from localStorage');
    }

    // Done
    callback();
  };


  _cachedFilesCollection.saveCache = function() {

    try {

      // Convert the collection map into string
      var dataString = EJSON.stringify(_cachedFilesCollection._collection._docs._map);
      // Store the data into localstorage
      localStorage.setItem(_localCollectionPrefix + name, dataString);

    } catch(err) {
      console.warn('CachedFile not store into localStorage');
    }

  };


  _cachedFilesCollection.saveCacheThrottled = function() {
    // Replace the last storage
    if (_storeFilesCollection) Meteor.clearTimeout(_storeFilesCollection);

    _storeFilesCollection = Meteor.setTimeout(function() {
      // Remove pointer
      _storeFilesCollection = null;

      // Save data
      _cachedFilesCollection.saveCache();

    }, 500); // Wait 500ms in case of multiple changes

  };

  // Load data before rigging observer
  _cachedFilesCollection.loadCache(function() {

    _cachedFilesCollection.find().observe({
      'added': _cachedFilesCollection.saveCacheThrottled,
      'changed': _cachedFilesCollection.saveCacheThrottled,
      'removed': _cachedFilesCollection.saveCacheThrottled
    });

  });


  // Extend the collection api
  _cachedFilesCollection.reset = function() {
    localStorage.removeItem(_localCollectionPrefix + name);
  };

  return _cachedFilesCollection;
};
