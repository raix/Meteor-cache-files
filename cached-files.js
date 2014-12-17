// Create reactive entity
var _ready = false;
var _readyDeps = new Tracker.Dependency();

// Quotas
var _quotas = {
  size: 0,    // bytes in total
  limit: 0,     // files
  age: 0,        // days
};

var _weight = {
  lastUsed: 1,    // greater than is good
  age: -1,        // greater than is bad
  count: 1,       // greater than is good
  size: 1,        // greater than is good
};

// List of files in the system
var _filesInCache = new LocalCollection('_cachedFilesCollection');

// Table description
// var tableDescriptor = [
//   'cached',     // Boolean
//   'loading',    // Boolean
//   'url',        // Source url
//   'name',       // file.ext
//   'nativeURL',  // native url
//   'localUrl',   // result of toURL()
//   'fullPath',   // full path
//   '_id',        // id
//   'createdAt',  // date
//   'updatedAt',  // date
//   'count',      // use counter
//   'size'        // file size - currently unavailable
// ];

_filesInCache.find().observe({
  'changed': function(newDoc, oldDoc) {
    // User just changed a file
    // We check to see if the cached flag has changed - if new is cached we
    // Want to check quotas...
    if (newDoc.cached && !oldDoc.cached) CachedFile.checkQuotas(newDoc._id);
  }
  // XXX: We could monitor removed or uncached to see if we could load another
  // file into the cache.
});

// Make sure quotas are not exeeded
Meteor.startup(function() {
  CachedFile.checkQuotas();
});

var parseFile = function(fileUrl) {
  // Split up the url
  var urlParts = fileUrl.split('/');
  // Name is last part
  var name = urlParts.pop();
  // Get name parts
  var fileNameParts = name.split('.');

  return {
    name: name,
    fileKey: fileNameParts[0],
    ext: fileNameParts[1],
  };
};

// Load file list and update the local collection
CachedFile.cachedFiles(function(err, entryList) {
  // Cant do much here
  if (err) return;

  // cached file list
  var cachedFilesIdArray = _.map(entryList, function(entry) {
    // sdf7as9f87sdf.jpg the first part of the filename is id
    var id = entry.name.split('.')[0];

    // Only add files
    if (id && entry.isFile) return id;
  });

  // Remove all files not found in cache...
  _filesInCache.update({ _id: { $nin: cachedFilesIdArray } }, {
    $set: {
      cached: false,
      loading: false,
      nativeURL: '',
      localUrl: '',
      fullPath: '',
      createdAt: new Date(),
    }
  });


  // Make sure all files in cache are correct in db
  _.each(entryList, function(fileEntry) {

    if (fileEntry.isFile) {

      // Update reference
      // Note that we cant add local files since we use the url as refernce
      // One could recreate if we had the base url and could add the filename
      var fileKey = parseFile(fileEntry.name).fileKey;

      _filesInCache.update({ _id: fileKey }, {
        $set: {
          cached: true,
          loading: false,
          nativeURL: fileEntry.nativeURL,
          internalUrl: fileEntry.toInternalURL(),
          localUrl: fileEntry.toURL(),
          fullPath: fullPath
        }
      });

    }

  });

  // CachedFile is ready
  _ready = true;
  _readyDeps.changed();
});

// Ready getter (Reactive)
CachedFile.ready = function() {
  _readyDeps.depend();
  return _ready;
};

// Files to install when app runs the first time
CachedFile.install = function(listOfFilesToInstall) {

  if (!localStorage.getItem('_cachedFilesInitial')) {

    _.each(listOfFilesToInstall, function(url) {
      // Check if file is already added
      var file = _filesInCache.findOne({ url: url });

      // At this point we load the url
      if (!file) CachedFile.load(url);
    });

    // XXX: Make sure this only run once?
    localStorage.setItem('_cachedFilesInitial', true);
  }

};

// Change quotas
CachedFile.quotas = function(quotas) {
  _.extend(_quotas, quotas);
};

// Change weight
CachedFile.weight = function(weight) {
  _.extend(_weight, weight);
};

// This function can be used if the usage of the files are important to the
// storage quota strategy
CachedFile.used = function(ref) {
  // Find the file to add count
  _filesInCache.update({ $or: [ { _id: ref }, { url: ref } ] }, { $inc: { count: 1 } });
};

var sortByWeight = function(a, b) {
  // a.createdAt  Age of subscriptions in ms
  // a.updatedAt  Time since last activity
  // a.count      Count of times its been used
  // a.size       Size of data
  // Weight
  var weightA = _weight.age * (a.createdAt > b.createdAt) +
                _weight.lastUsed * (a.updatedAt > b.updatedAt) +
                _weight.count * (a.count > b.count) +
                _weight.size * (a.size > b.size);

  var weightB = _weight.age * (b.createdAt > a.createdAt) +
                _weight.lastUsed * (b.updatedAt > a.updatedAt) +
                _weight.count * (b.count > a.count) +
                _weight.size * (b.size > a.size);

  if (weightA > weightB) return -1; // a is less

  if (weightA < weightB) return 1; // b is less

  return 0; // Equal
};

CachedFile.checkQuotas = function(importantFileId) {
  // 1. Sort the cached files by weight
  // 2. Iterate throug and test quotas
  // 3. Remove files if quota exeeded
  // Note: the latest file should not be uncached...
  var cachedFilesArray = _filesInCache.find({
    $and: [
      { _id: { $ne: importantFileId } },
      { cached: true }
    ]
  }).fetch();

  // sort the files by weight
  cachedFilesArray.sort(sortByWeight);

  // Get the important file
  var importantFile = _filesInCache.findOne(importantFileId);

  // Add the important file as top
  if (importantFile) cachedFilesArray.unshift(importantFile);

  // Quotas
  var countFiles = 0;
  var totalSize = 0;

  // id list of files to remove from cache
  var filesToRemove = {};

  var exeededRemoveFile = function(file) {
    // Remove this file from cache...
    countFiles--;
    totalSize -= file.size;
    filesToRemove[file.url] = file._id;
  };


  _.each(cachedFilesArray, function(file) {
    countFiles++;
    totalSize += file.size;
    var ageInDays = Math.round((+new Date() - file.updatedAt) / 86400000); //  1000 * 60 * 60 * 24

    // Make sure size limit is not exeeted
    if (_quotas.size && totalSize > _quotas.size) {
      // Remove this file from cache...
      exeededRemoveFile(file);
    }

    // Make sure file count is not exeeded
    if (_quotas.limit && countFiles > _quotas.limit) {
      // Remove this file from cache...
      exeededRemoveFile(file);
    }


    // Make sure file age is not exeeded
    if (_quotas.age &&  ageInDays > _quotas.age) {
      // Remove this file from cache...
      exeededRemoveFile(file);
    }

  });

  // Remove the exeeding files from cache...
  _.each(filesToRemove, function(id, url) {
    CachedFile.remove(id);
  });

};

// Add file to cache
CachedFile.add = function(fileUrl) {
  // Parse the name
  var nameParts = parseFile(fileUrl);
  // Split up the url
  var urlParts = fileUrl.split('/');
  // Name is last part
  var name = urlParts.pop();
  // Get fileKey
  var fileKey = name.split('.')[0];

  var id = Random.id();

  // Insert the file for reactive status
  return _filesInCache.insert({
    _id: id,
    cached: false,
    loading: false,
    url: fileUrl,
    fileKey: nameParts.fileKey,
    name: id + '.' + nameParts.ext,
    filename: nameParts.name,
    createdAt: new Date(),
    updatedAt: new Date()
  });

};

// Add file to cache
CachedFile.load = function(fileUrl, callback) {
  if (!fileUrl) {
    throw new Error('fileUrl arg is required');
  }

  // Check if the file is already found
  var file = _filesInCache.findOne({ url: fileUrl });

  // If the file is not found we go create one
  if (!file) {
    // Add the file
    CachedFile.add(fileUrl);

    // Set the file
    file = _filesInCache.findOne({ url: fileUrl });

    if (!file) {
      throw new Error('load error');
    }
  }

  // Set loading...
  _filesInCache.update({ url: fileUrl }, { $set: { loading: true } });

  CachedFile.downloadFile(file.name, fileUrl, function(err, fileEntry, metadata) {
    if (err) {

      _filesInCache.update({ url: fileUrl }, {
        $set: {
          cached: false,
          loading: false,
          nativeURL: '',
          localUrl: '',
          fullPath: '',
          createdAt: new Date(),
        }

      });

    } else {

      _filesInCache.update({ url: fileUrl }, {
        $set: {
          loading: false,
          cached: true,
          nativeURL: fileEntry.nativeURL,
          fullPath: fileEntry.fullPath,
          localUrl: fileEntry.toURL(),
          internalUrl: fileEntry.toInternalURL(),
          updatedAt: new Date(),
          size: metadata.size,
          mtime: metadata.modificationTime
        }
      });

    }
    callback && callback(err);
  });
};

CachedFile.ensure = function(fileUrl, callback) {
  if (!callback) {
    throw new Error('callback is required');
  }

  Tracker.autorun(function (c) {
    var file = _filesInCache.findOne({ url: fileUrl });

    if (!file || (!file.cached && !file.loading)) {
      CachedFile.load(fileUrl);
    } else if (file.cached) {
      c.stop();
      callback(file);
    }
  });
};

// Remove file from cache
CachedFile.remove = function(ref) {
  // Find the file to remove
  var file = _filesInCache.findOne({ $or: [ { _id: ref }, { url: ref } ] });

  // Remove the file in cache
  CachedFile.removeFile(file.name, function(err) {
    // Cached file removed
  });

  // Remove the file record
  // Should we actually remove this or simply disable?
  if (file) _filesInCache.update({ _id: file._id }, { $set: {
    cached: false,
    loading: false,
    nativeURL: '',
    localUrl: '',
    fullPath: '',
    createdAt: new Date(),
    updatedAt: new Date()
  } });
};

Template.registerHelper('CachedFile', function(url) {
  console.log('{{ CachedFile }} nr. of arguments: ', arguments.length);
  // If no arguments then return list of files in cache
  // If one argument then return the file url - and make sure its added to the
  // cache.
  if (arguments.length) {
    var file = _filesInCache.findOne({ url: url });
    if (!file) {

      // Add the file in collection
      Meteor.setTimeout(function() {
        CachedFile.add(url);
      }, 0);

    }

    // Return the file found
    return file;
  } else {
    // Return empty list
    return _filesInCache.find();
  }
});

