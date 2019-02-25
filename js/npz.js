// requires zip.js, zip-ext.js, inflate.js and npy.js
// NPZ files are just zip files; here we assume we have
// a collection of arrays in the npz file, along with
// some JSON blocks, also zipped in the file


// avoids having to specify path to zip files
zip.useWebWorkers = false;

function load_model(blob, file_name) {
    var reader = new FileReader();
    return parse_npz(reader);
}

function readJSONBlob(blob) {
    var promise = new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            // the file contents have been read as an array buffer
            var buf = reader.result;
            var result = JSON.parse(buf);
            resolve(buf);
        };
        reader.readAsText(blob);
    });
    return promise;
}

function readNpy(blob)
{
    return new Promise(function (resolve, reject)
    {
        NumpyLoader.open(blob, function (arr) {
            resolve(arr);            
        });
    });
}

// iterate over each file in a zip file
// calls file_callback(blob, filename, extension) on each file
// file should return the a Promise unpacking the results
function iterate_zip(reader, file_callback) {    
    // iterate over the zip 
    var all_promise = new Promise(function (resolve, reject) {
        reader.getEntries(function (entries) {
            var promises = [];
            // process each entry, creating a promise for each file in the zip archive
            for (var entry of entries) {
                var result = new Promise(function (resolve_file, reject_file) {
                    // get the blob data
                    entry.getData(new zip.BlobWriter(),
                        function () {
                            // preserve filename
                            var filename = entry.filename;
                            var callback = file_callback;
                            return function (blob) {
                                var components = filename.split(".");
                                var extension = components[components.length - 1];
                                callback(blob, filename, extension).then(result => resolve_file([filename, result]));                                
                            }
                        }()
                    )
                });
                promises.push(result);
            }  
            // resolve to a mapping of filenames to loaded entries                      
            Promise.all(promises).then(function(value)
            {
                mapping = {};
                for(var i=0;i<value.length;i++)
                {
                    mapping[value[i][0]] = value[i][1];
                }                
                resolve(mapping);
            });            
        })
    });
    return all_promise;
}

function parse_npz2(reader)
{
    return iterate_zip(reader, function(blob, filename, extension)
    {                
        if(extension=='npy') return readNpy(blob);
        if(extension=='json') return readJSONBlob(blob);
        else return null;
    });
}

function parse_npz(reader, callback, array_transformer) {
    // default: don't change arrays after loading
    array_transformer = array_transformer || (arr => arr);

    // iterate over the zip 
    reader.getEntries(function (entries) {
        var n_entries = entries.length;
        var n_files = 0;
        var arrays = {
            "json": {},
            "arrays": {}
        };
        for (var entry of entries) {

            function load_blob(blob, file_name) {

                var components = file_name.split(".");
                var extension = components[components.length - 1];


                function completion_check() {
                    n_files += 1;
                    // if we've loaded everything, call the callback                        
                    if (n_files == n_entries) {
                        callback(arrays);
                    }
                }

                // load array data
                if (extension === 'npy') {
                    // load an array from a blob
                    NumpyLoader.open(blob, function (arr) {
                        // post-process with transformer function (e.g. convert to tf.js as we load)
                        arrays["arrays"][file_name.slice(0, -4)] = array_transformer(arr);
                        completion_check();
                    });
                }
                // extension: allow JSON files as well
                else if (extension === 'json') {
                    var reader = new FileReader();
                    reader.onload = function () {
                        // the file contents have been read as an array buffer
                        var buf = reader.result;
                        var result = JSON.parse(buf);
                        arrays["json"][file_name.slice(0, -5)] = result;
                        completion_check();
                    };
                    reader.readAsText(blob);
                }
                // other type of file: ignored for now
                else {
                    completion_check();
                }
            }

            // Read one file, either NPy or JSON (or some other type,
            // which will be ignored).
            entry.getData(new zip.BlobWriter(),
                (function () {
                    // need to bind the name!
                    var file_name = entry.filename;
                    return function (blob) {
                        load_blob(blob, file_name);
                    }
                })());
        }
    });
}

function load_npz(url, callback, array_transformer) {
    // read zip from URL
    zip.createReader(new zip.HttpReader(url), reader => parse_npz(reader, callback, array_transformer));
}
function load_npz2(url) {
    // read zip from URL
    return new Promise(function(resolve, reject)
    {
        zip.createReader(new zip.HttpReader(url), reader => parse_npz2(reader).then(value => resolve(value)));
    })
}