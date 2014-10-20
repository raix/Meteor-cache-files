raix:cache-files
================

This package will try to cache files for offline usage.

## Usage

```js
    // These files should be loaded when the app is used the first time
    // if the user wants to use a file not in the list CachedFile will
    // pause a bit allowing the user to stream the specific file.
    // CachedFile will add the file to the cache and continue loading the
    // rest of the files.
    CachedFile.install([
        'http://gi2.dk/images/logo51x51.png',
        'http://gi2.dk/media/1004/irish-hands.jpg'
    ]);

    CachedFile.quotas({
        size: 1024, // size limit in bytes, 0 is disabled
        count: 12,  // total number of files allowed, 0 disabled
    });

    // The CachedFile will adapt to the quota set, its done by weight /
    // importance. To customize the behaviour one can change the values.
    // Setting one to 0 will disable the weight. Negative values are allowed
    // these will reverse the effect.
    CachedFile.weight({
        age: 1,
        lastUsed: 1,
        count: 1,
        size: 1
    });

    // Add files to the cache later
    CachedFile.add('http://gi2.dk/media/1001/fremhaevetgrafik_android_banner.png');

    // Remove a file manually
    CachedFile.remove('http://gi2.dk/media/1001/fremhaevetgrafik_android_banner.png');
```

```html
    {{#each CachedFile}}
        {{#if isCached}}
            <img src="{{url}}"/>
        {{else}}
            <img src="waiting.gif"/>
        {{/if}}
        <br/>
    {{else}}
        No files in cache
    {{/each}}

    <!-- Or -->

    {{#with CachedFile 'http://gi2.dk/images/logo51x51.png'}}
        {{#if isCached}}
            <img src="{{url}}"/>
        {{else}}
            <img src="waiting.gif"/>
        {{/if}}
    {{/with}}

```