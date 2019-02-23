import pymc3 as pm
from pprint import pprint
from arviz_json import arviz_to_json

def describe_distribution(d):
    """
    Takes a PyMC3 distribution object and returns a dictionary describing it.
    {
        "type": the type of the variable, e.g. "Normal"
        "shape": the array shape of the variable, e.g. (200,) or () for a scalar
    }
    """

    return {"type": d.__class__.__name__, "shape": list(d.shape)}  # distribution

def get_dag(model):
    """
    Return a description of the DAG of a PyMC3 model as a dictionary, 
    using the model_graph module to get the graph, and interrogating 
    each variable node to get some basic properties.
    

    Parameters:
    -----------
        model:          The model to extract the graph from

    Returns:
    --------
        variables       A dictionary of variables.

    Each variable is described as:

        "id": {"name":name,
                "type": free|observed|determinsitc|potential|imputation,
                "distribution": {} or distribution description,
                "parents": list of parent variable ids,
                "size": size of this variable (i.e. product of the shape),
            }
    """

    variable_descriptor = {}
    variables = model.named_vars

    # get the DAG for this model
    graph = pm.model_graph.ModelGraph(model)
    dag = graph.make_compute_graph()
    dag = {k: list(v) for k, v in dag.items()}

    # iterate over named variables in the graph
    for k, v in variables.items():
        vtype = "unknown"
        size = 0
        data_shape = ()

        descriptor = {}

        # get the type of the variable
        if v in model.free_RVs:
            vtype = "free"
            size = v.dsize
        if v in model.observed_RVs:
            vtype = "observed"
        if v in model.deterministics:
            vtype = "deterministic"
        if v in model.potentials:
            vtype = "potential"
        if v in model.missing_values:
            vtype = "imputation"

        # if the variable is a distribution, describe the distribution
        if hasattr(v, "distribution"):
            distribution = describe_distribution(v.distribution)
        else:
            distribution = {}

        variable_descriptor[k] = {
            "name": v.name,
            "type": vtype,
            "parents": dag.get(k, []),
            "size": size,
            "distribution": distribution,
        }
    return variable_descriptor

