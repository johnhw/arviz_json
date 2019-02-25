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
            resolve(result);
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

function parse_npz(reader)
{
    return iterate_zip(reader, function(blob, filename, extension)
    {                
        if(extension=='npy') return readNpy(blob);
        if(extension=='json') return readJSONBlob(blob);
        else return null;
    });
}


function load_npz(url) {
    // read zip from URL
    return new Promise(function(resolve, reject)
    {
        zip.createReader(new zip.HttpReader(url), reader => resolve(parse_npz(reader)));
    })
}