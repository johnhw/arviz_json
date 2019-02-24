// functions for manipulating ARViz data

// put the arrays back into the places they came from, inside th
// data structure itself
function reassemble_arviz(npz_block) {

    var inference_data = npz_block.json.header.inference_data;
    var arrays = npz_block.arrays;
    for (k in inference_data) {
        vars = inference_data[k].vars;
        // extract arrays
        for (v in vars) {
            var var_v = vars[v];
            var_v.array = arrays[var_v.array_name];
        }
    }
    return inference_data;
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
    return samples;
}

// return a single random sample from the trace, and from the prior
// and linearly interpolate between them according to the given factor
function getLinearSample(a, b, vars, w) {
    var prior_samples = getSample(a, vars);
    var posterior_samples = getSample(b, vars);
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