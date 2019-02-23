
function _load_arviz(json_url, npz_url, callback)
{
    // load the header
    function loadJSON(callback) {   
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', json_url, true); 
        xobj.onreadystatechange = function () {
              if (xobj.readyState == 4 && xobj.status == "200") {                
                callback(xobj.responseText);
              }
        };
        xobj.send(null);  
     }

    loadJSON(function (json_string)
        {
            var json = JSON.parse(json_string);
            var arrays = load_npz(npz_url, function(arrays)
            {
                // store the arrays inside the object
                json.arrays = arrays;
                callback(json);
            })
        }
    );
}

function load_arviz(fname, callback)
{
    _load_arviz(fname+".json", fname+".npz", callback)
}