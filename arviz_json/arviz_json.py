from arviz.inference_data import inference_data

def write_concatenated_npy

def inference_data_to_json(inference_data, output_name):
    """
        Take an inference data xarray object, and return a JSON representation
        that can be loaded client-side.

        Writes:

            <output_name>.json: Plain JSON format representation

            <output_name>.bin: binary data, indexed by the JSON metadata.
            The binary file format is just a sequence of npy files, concatenated 
            into a single blob.
            

        Parameters:
        -----------

        inference_data: An ARviz inference data object
        output_name: A folder to write the data into

        Returns:
        --------

        json_metadata: the metadata, as a single JSON file
        binaries: a dictionary mapping a binary name to a corresponding numpy array
    """