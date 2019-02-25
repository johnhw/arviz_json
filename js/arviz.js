// functions for manipulating ARViz data

// put the arrays back into the places they came from, inside the
// data structure itself. Optionally, allow each array to be
// transformed before inserting it into the data structure
// (e.g. to automaticaly tf.js each entry)
function reassemble_arviz(npz_block, array_transformer) {
    var transformer = array_transformer || (x=>x);
    var inference_data = npz_block["header.json"].inference_data;        
    for (k in inference_data) {
        vars = inference_data[k].vars;        
        // extract arrays
        for (v in vars) {
            var var_v = vars[v];
            // lookup the array block
            var array_fname = var_v.array_name+".npy";            
            var_v.array = transformer(npz_block[array_fname]);
        }
    }    
    return inference_data;
}

// apply arviz reconstuction to multiple models
function reassembleMultiModel(models, array_transformer)
{
    var arviz_models = {};
    for(k in models)
    {
        var fname_no_npz = k.slice(0,-4);
        arviz_models[fname_no_npz] = reassemble_arviz(models[k], array_transformer);
    }
    return arviz_models;
}

function getData(property, varname) {

    return property.vars[varname].array.data;
}

// return N samples from a set of variables
function getNSample(property, vars, n) {

    var v0 = vars[0];
    var length = getData(property[v0]).length;
    var random_indices = Array.from({
        length: n
    }, () => Math.floor(Math.random() * length));
    var samples = {};
    for (i = 0; i < vars.length; i++) {
        var v = vars[i];
        samples[v] = Array.from({
            length: n
        }, (_, ix) => getData(property, v)[random_indices[ix]]);
    }
    return samples;
}

// get a single sample from a set of variables
function getSample(property, vars) {
    var v0 = vars[0];
    var random_index = Math.floor(Math.random() * getData(property, v0).length);
    var samples = {};
    for (i = 0; i < vars.length; i++) {
        var v = vars[i];
        samples[v] = getData(property, v)[random_index];
    }
    return {"sample":samples, "index":random_index};
}

// return a single random sample from the trace, and from the prior
// and linearly interpolate between them according to the given factor
function getLinearSample(a, b, vars, w) {
    var prior_samples = getSample(a, vars).sample;
    var posterior_samples = getSample(b, vars).sample;
    var weighted_samples = {}
    for (v in posterior_samples) {
        weighted_samples[v] = (1 - w) * posterior_samples[v] + (w) * prior_samples[v];
    }
    return weighted_samples;
}

// return average trace values
function getExpectation(property, vars, weights) {
    expectations = {};
    
    var trace_length = getData(property, vars[0]).length;
    if (typeof weights === 'undefined') {
        for (i = 0; i < vars.length; i++) {
            var v = vars[i];
            expectations[v] = getData(property, v).reduce((a, b) => a + b) / trace_length;
        }
    } else {
        for (i = 0; i < vars.length; i++) {
            var v = vars[i];
            expectations[v] = getData(property, v).map((x, ix) => x * weights[ix]).reduce((a, b) => a + b);
        }
    }
    return expectations;
}