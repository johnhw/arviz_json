// requires zip.js, zip-ext.js, inflate.js and npy.js
// NPZ files are just zip files; here we assume we have
// a collection of arrays in the npz file, along with
// some JSON blocks, also zipped in the file


// avoids having to specify path to zip files
zip.useWebWorkers = false;

function load_npz(url, callback) {
    // read zip from URL
    zip.createReader(new zip.HttpReader(url), function (reader) {

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
                            arrays["arrays"][file_name.slice(0, -4)] = arr;
                            completion_check();
                        });
                    }

                    // extension: allow JSON files as well
                    if (extension === 'json') {
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
    });
}