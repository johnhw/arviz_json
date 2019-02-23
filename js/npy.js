// From https://gist.github.com/nvictus/88b3b5bfe587d32ac1ab519fd0009607
// Client-side parser for .npy files
// See the specification: http://docs.scipy.org/doc/numpy-dev/neps/npy-format.html

var NumpyLoader = (function () {
    function asciiDecode(buf) {
        return String.fromCharCode.apply(null, new Uint8Array(buf));
    }

    function readUint16LE(buffer) {
        var view = new DataView(buffer);
        var val = view.getUint8(0);
        val |= view.getUint8(1) << 8;
        return val;
    }

    function fromArrayBuffer(buf) {
      // Check the magic number
      var magic = asciiDecode(buf.slice(0,6));      
      if (magic.slice(1,6) != 'NUMPY') {
          throw new Error('unknown file type');
      }

      var version = new Uint8Array(buf.slice(6,8)),
          headerLength = readUint16LE(buf.slice(8,10)),
          headerStr = asciiDecode(buf.slice(10, 10+headerLength));
          offsetBytes = 10 + headerLength;
          //rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

      // Hacky conversion of dict literal string to JS Object
      eval("var info = " + headerStr.toLowerCase().replace('(','[').replace('),',']'));
    
      // Intepret the bytes according to the specified dtype
      var data;
      if (info.descr === "|u1") {
          data = new Uint8Array(buf, offsetBytes);
      } else if (info.descr === "|i1") {
          data = new Int8Array(buf, offsetBytes);
      } else if (info.descr === "<u2") {
          data = new Uint16Array(buf, offsetBytes);
      } else if (info.descr === "<i2") {
          data = new Int16Array(buf, offsetBytes);
      } else if (info.descr === "<u4") {
          data = new Uint32Array(buf, offsetBytes);
      } else if (info.descr === "<i4") {
          data = new Int32Array(buf, offsetBytes);
      } else if (info.descr === "<f4") {
          data = new Float32Array(buf, offsetBytes);
      } else if (info.descr === "<f8") {
          data = new Float64Array(buf, offsetBytes);
      } else {
          throw new Error('unknown numeric dtype')
      }

      return {
          shape: info.shape,
          fortran_order: info.fortran_order,
          data: data
      };
    }

    function open(file, callback) {
        var reader = new FileReader();
        reader.onload = function() {
            // the file contents have been read as an array buffer
            var buf = reader.result;
            var ndarray = fromArrayBuffer(buf);
            callback(ndarray);
        };
        reader.readAsArrayBuffer(file);
    }

    function ajax(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            var buf = xhr.response; // not responseText
            var ndarray = fromArrayBuffer(buf);
            callback(ndarray);
        };
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
    }

    return {
        open: open,
        ajax: ajax,
        from_buffer: fromArrayBuffer
    };
})();


// Read a concatenated block of NPY files,
// using a header object that specifies the names and
// offsets of the arrays to be loaded.
// Each entry has a name, mapped to a start and end byte offset pair, like:
// {
//    "vars":(0,512)
//    "samples": (512, 4096)
//    "probabilities": (4096, 12000)
//}
var NpyBufferLoader = (function () {
    function ajax(url, callback, array_blocks) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function(e) {
            var buf = xhr.response;
            var array_mapping = {};
            for(var array_name in array_blocks)
            {
                var sub_buffer_range = array_blocks[array_name]; // (start, end) pair
                var sub_buffer = buf.slice(sub_buffer_range[0], sub_buffer_range[1])
                var ndarray = fromArrayBuffer(sub_buffer);
                array_mapping[array_name] = ndarray;
            }
            
            callback(array_mapping);
        };
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
    }
    return {        
        ajax: ajax,        
    };
});