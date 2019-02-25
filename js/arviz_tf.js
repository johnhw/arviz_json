// helper to convert arrays on loading directly into TensorFlow.js arrays
function tf_array(arr)
{    
    // type conversions to TF standard types    
    var conversions = [
        [Float64Array, Float32Array],
        [Int8Array, Int32Array],
        [Int16Array, Int32Array],        
    ];
    
    var data = arr.data;
    for(var i=0;i<conversions.length;i++)
    {
        var from_type = conversions[i][0];
        var to_type = conversions[i][1];
        if(arr.data instanceof from_type)
            data = to_type.from(arr.data);
    }        

    // return the TF tensor version
    return tf.tensor(data, arr.shape);
}