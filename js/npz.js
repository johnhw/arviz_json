// requires zip.js, zip-ext.js, inflate.js and npy.js

// avoids having to specify path to zip files
zip.useWebWorkers = false;

function load_npz(url, callback)
{
    zip.createReader(new zip.HttpReader(url), function(reader)
    {
        reader.getEntries(function(entries)
        {
            var n_entries = entries.length;
            var n_arrays = 0;
            var arrays = {};
            for(var entry of entries)
            {
                var without_npy = entry.filename.slice(0, -4);            
                function load_blob(blob, array_name)
                {                                    
                    // load an array from a blob
                    NumpyLoader.open(blob, function(arr)
                    {                                                
                        arrays[array_name] = arr;
                        n_arrays += 1;
                        // if we've loaded everything, call the callback                        
                        if(n_arrays == n_entries)
                        {
                            callback(arrays);
                        }
                    });
                }

                // Read one npy file
                entry.getData(new zip.BlobWriter(), 
                (function () {
                    // need to bind the name!
                    var array_name = without_npy;
                    return function (blob)
                    {                        
                        load_blob(blob, array_name);
                    }
                })());                    
            }
        });
    });
}
