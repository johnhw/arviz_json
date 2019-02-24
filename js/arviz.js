// functions for manipulating ARViz data

// put the arrays back into the places they came from, inside th
// data structure itself
function reassemble_arviz(npz_block)
{
    
    var inference_data = npz_block.json.header.inference_data;
    var arrays = npz_block.arrays;
    for(k in inference_data)
    {
        vars = inference_data[k].vars;
        // extract arrays
        for(v in vars)
        {
            var var_v = vars[v];
            var_v.array = arrays[var_v.array_name];            
        }
    }
    return inference_data;
}