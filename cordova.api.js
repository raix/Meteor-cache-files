/* global CachedFile, cordova, FileTransfer */

// CORDOVA ONLY

// Folder Entry is our namespaced cache folder to work in
var folderEntry;

CachedFile.getEntry = function(callback) {
  // Check if we already got the reference
  if (folderEntry) callback(null, folderEntry);

  // Make sure cordova is ready before trying this
  document.addEventListener("deviceready", function() {

    var successCallback = function(cacheDirectory) {
      if (cacheDirectory.isDirectory) {
        // We got the directory - now get the namespace folder for this package
        cacheDirectory.getDirectory(
          'cachedFiles',
          { create: true, exclusive: false },
          function(cacheFolder) {

            if (cacheFolder.isDirectory) {
              // Got the target folder entry
              folderEntry = cacheFolder;

              // Callback
              callback(null, folderEntry);
            } else {
              // Callback an error - we did expect this to be a directory
              callback(new Error('Got namespace file instead of directory'));
            }

          },
          callback
        );
      } else {
        // Callback an error - we did expect this to be a directory
        callback(new Error('Got cached file instead of directory'));
      }
    };

    window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, successCallback, callback);
  }, false);

};


// This function will download the file and place it in the cache folder
// and update the list of cached files
CachedFile.downloadFile = function(id, url, callback) {
  // cordova.file.cacheDirectory
  // window.resolveLocalFileSystemURL() -> DirectoryEntry
  CachedFile.getEntry(function(err, folder) {
    // Handle errors
    if (err) return callback(err);

    // Suffix the filename
    var destinationUrl = folder.toURL() + id;

    // Encode the url
    var sourceUrl = encodeURI(url);

    // Create transfer object
    var fileTransfer = new FileTransfer();

    fileTransfer.download(
      sourceUrl,
      destinationUrl,
      function(fileEntry) {

        // File stored!
        fileEntry.getMetadata(function(metadata) {
          // Pass on metadata
          callback(null, fileEntry, metadata);
        }, function() {
          // Got no metadata
          callback(null, fileEntry, {});
        });
      },
      callback,   // Error callback
      false,      // Trust all hosts, default false
      {
        // XXX: We could add support for headers etc.
        // headers: {
        //   'Authorization': 'Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=='
        // }
      }
    );

  });
};

// This function will fetch list of files in the cache
CachedFile.cachedFiles = function(callback) {
  CachedFile.getEntry(function(err, folder) {
    // Handle errors
    if (err) return callback(err);

    // Create directory reader
    var reader = folder.createReader();

    reader.readEntries(function(entries) {
      // Got some cached entries
      callback(null, entries);

    }, callback);

  });
};

CachedFile.removeFile = function(id, callback) {
  CachedFile.getEntry(function(err, folder) {
    // Handle errors
    if (err) return callback(err);

    folder.getFile(id, { create: false, exclusive: false }, function(fileEntry) {
      fileEntry.remove(function() {
        // File removed
        callback(null);
      }, callback);
    }, callback);
  });
};
