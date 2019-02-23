import arviz as az
import numpy as np
import json

def fix_dtype(data):
    """Convert the passed object to a numpy array, making sure that the dtype is one of:
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


def arviz_to_json(inference_data, output_name):
    """
        Take an inference data xarray object, and return a JSON representation
        that can be loaded client-side.

        Writes:

            <output_name>.json: JSON header
            <output_name>.npz: Arrays, as an NPZ file            

        Parameters:
        -----------

        inference_data: An ARviz inference data object
        output_name: The prefix of the output files

    """

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

        array_headers[group_name] = header

    json_block = {"inference_data": array_headers}
    with open(f"{output_name}.json", "w") as f:
        json.dump(json_block, f)
    np.savez(f"{output_name}.npz", **arrays)


if __name__ == "__main__":
    import arviz as az
    data = az.load_arviz_data("centered_eight")
    arviz_to_json(data, "centered_eight")
