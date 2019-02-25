// requires zip.js, zip-ext.js, inflate.js and npy.js
// NPZ files are just zip files; here we assume we have
// a collection of arrays in the npz file, along with
// some JSON blocks, also zipped in the file


// avoids having to specify path to zip files
zip.useWebWorkers = false;


function readJSONBlob(blob) {
    var promise = new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
            // the file contents have been read as an array buffer
            var buf = reader.result;
            var result = JSON.parse(buf);
            resolve(result);
        };
        reader.readAsText(blob);
    });
    return promise;
}

function readNpyBlob(blob) {
    return new Promise(function (resolve, reject) {
        NumpyLoader.open(blob, function (arr) {
            resolve(arr);
        });
    });
}
// convert [[a,b], [c, d], ...] -> {a:b, c:d, ...}
function pairsToObj(pairs) {
    var mapping = {};
    for (var i = 0; i < pairs.length; i++) {
        mapping[pairs[i][0]] = pairs[i][1];
    }
    return mapping;
}

// iterate over each file in a zip file
// calls file_callback(blob, filename, extension) on each file
// file should return the a Promise unpacking the results
function iterateZip(reader, file_callback) {
    // iterate over the zip 
    var all_promise = new Promise(function (resolve, reject) {
        reader.getEntries(function (entries) {
            var entry_promises = [];
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
                entry_promises.push(result);
            }
            // resolve to a mapping of filenames to loaded entries                      
            Promise.all(entry_promises).then(function (pairs) {
                resolve(pairsToObj(pairs));
            });
        })
    });
    return all_promise;
}

function parseNpz(reader) {
    return iterateZip(reader, function (blob, filename, extension) {
        if (extension == 'npy') return readNpyBlob(blob);
        if (extension == 'json') return readJSONBlob(blob);
        else return null;
    });
}

function readZipWith(url, readerFn) {
    return new Promise(function (resolve, reject) {
        zip.createReader(new zip.HttpReader(url), reader => resolve(readerFn(reader)));
    })
}

function load_npz(url) {
    return readZipWith(url, parseNpz);
}

// load an NPZ file from an in memory blob
function readNpzBlob(blob) {
    var promise = new Promise(function (resolve, reject) {
        zip.createReader(new zip.BlobReader(blob), reader=>resolve(parseNpz(reader)));        
    });
    return promise;
}

// load multiple npz files inside a zip file
// optionally, can be metadata as json inside the zip as well
function loadMultiModel(url) {
    function parse_multi(reader) {
        return iterateZip(reader, function (blob, filename, extension) {
            if (extension == 'npz') return readNpzBlob(blob);
            if (extension == 'json') return readJSONBlob(blob);
        });
    }
    return readZipWith(url, parse_multi);
}