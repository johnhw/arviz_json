import arviz as az
import numpy as np
import json
import zipfile
from io import BytesIO

def write_for_js(npz_file, header, arrays, compressed=True, verbose=False):
    """Write the data to a JSON file for loading in JS, along with
    the NPZ file containing the arrays"""

    # dump the arrays to the file output    
    if compressed:
        np.savez_compressed(npz_file, **arrays)
    else:
        np.savez(npz_file, **arrays)

    # write JSON to the npz file
    output = {"inference_data": header}
    z = zipfile.ZipFile(npz_file, "a")
    # header data will be in a file called "header.json" inside the zip
    if compressed:
        z.writestr("header.json", json.dumps(output), zipfile.ZIP_STORED)
    else:
        z.writestr("header.json", json.dumps(output), zipfile.ZIP_DEFLATED)

    # output listing if requested
    if verbose:
        print("Writing archive file...")
        z.printdir()
    z.close()


def fix_dtype(data):
    """Convert the passed object to a numpy array, making sure that the dtype is one of
       the types that the npy loader currently supports. This could be one of:
       |u1, |i1, <u2, <u4, <i4, <f4, <f8
    """
    arr = np.array(data)
    valid_dtypes = ["|u1", "|i1", "<u2", "<u4", "<i4", "<f4", "<f8"]

    # remap known mappings
    dtype_mapping = {"|b1": "|i1", "<i8": "<f8", "<u8": "<f8", "?1": "u1", "|B1": "|u1"}
    current_dtype = arr.dtype.str
    if current_dtype in dtype_mapping:
        arr = arr.astype(dtype_mapping[current_dtype])

    # check if we now have a valid array type
    if arr.dtype not in valid_dtypes:
        raise ValueError(
            f"Data type {current_dtype} is not supported. Define a conversion in fix_dtype() if necessary."
        )
    return arr

def multi_arviz_to_json(models, output, compressed=True):
    """
        Take a mapping of {name:InferenceData objects}, and write all of the
        corresponding models into a single ZIP file with the given name.

        Filenames should be specified in the mapping without the npz suffix.
        For example:

            {
                "model_linear" : model_linear,
                "model_quadratic" : model_quadratic
            }

        Each model will be an `npz` file exactly as written by `arviz_to_json`
    """
    z = zipfile.ZipFile(output, "w")

    # select compression flag
    if compressed:
        zip_mode = zipfile.ZIP_DEFLATED
    else:
        zip_mode = zipfile.ZIP_STORED

    # write each npz file into memory, then compress into a single zip file
    for name, model in models.items():
        f = BytesIO()
        arviz_to_json(model, f)
        z.writestr(name+".npz", f.getvalue())

    z.close()


def arviz_to_json(inference_data, output_name):
    """
        Take an inference data Xarray object, and return a JSON representation
        that can be loaded client-side, along with an NPZ file that holds the
        array data.

        Writes:            
            <output_name>.npz: Arrays, as an NPZ file, with JSON included in archive

        Parameters:
        -----------

        inference_data: An ARviz inference data object
        output_name: The name of the output file

    """

    # standard arviz groups
    arviz_groups = [
        "observed_data",
        "posterior",
        "posterior_predictive",
        "prior",
        "sample_stats",
    ]
    array_index = 0
    arrays = {}
    array_headers = {}

    for group_name in arviz_groups:
        group = inference_data.__getattribute__(group_name)
        header = {
            "attrs": dict(group.attrs),
            "dims": dict(group.dims),
            "coords": {k: [i.item() for i in v] for k, v in group.coords.items()},
            "vars": {},
            "array_names":{}
        }
        for var, var_data in group.data_vars.items():
            # ensure each array has a unique filename
            array_name = f"{group_name}_{var}_{array_index}"
            array_index += 1
            # store the header for this array,
            header["vars"][var] = {
                "dims": list(var_data.dims),
                "attrs": dict(var_data.attrs),
                "dtype": var_data.data.dtype.str,  # *Original* dtype, in case we are forced to convert
                "shape": var_data.data.shape,
                "array_name": array_name,
            }
            arrays[array_name] = fix_dtype(var_data.data)
            header["array_names"][var] = array_name

        array_headers[group_name] = header

    write_for_js(output_name, array_headers, arrays)


