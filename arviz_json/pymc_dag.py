import pymc3 as pm
from arviz_json import arviz_to_json, pymc3_graph

def describe_distribution(d):
    """
    Takes a PyMC3 distribution object and returns a dictionary describing it.
    {
        "dist": the dist name of the variable, e.g. "Normal"
        "type": the type of the variable, e.g. "Continuous"
        "shape": the array shape of the variable, e.g. (200,) or () for a scalar
    }
    """
    cls=[c.__name__ for c in d.__class__.__mro__]
    if "Discrete" in cls:
        typ="Discrete"
    elif "Continuous" in cls:
        typ="Continuous"
    else:
        typ=""
    return {"dist": d.__class__.__name__, "type": typ, "shape": list(map(int, list(d.shape)))}  # distribution
    #return {"type": d.__class__.__name__, "shape":  list(d.shape), "params": params, "param_values": values} # distribution # added


def get_dag(model):
    """
    Return a description of the DAG of a PyMC3 model as a dictionary, 
    using the model_graph module to get the graph, and interrogating 
    each variable node to get some basic properties.
    

    Parameters:
    -----------
        model:          The model to extract the graph from
        dims            Dict of {str: list of str}: Map of variable names to the coordinate names to use to index its dimensions.
        coords:         Dict of {str: array-like}: Map of coordinate names to coordinate values
        

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
        # get the type of the variable
        if v in model.free_RVs:
            vtype = "free"
            size = v.dsize
        elif v in model.observed_RVs:
            vtype = "observed"
        elif v in model.deterministics:
            vtype = "deterministic"
        elif v in model.potentials:
            vtype = "potential"
        elif v in model.missing_values:
            vtype = "imputation"
        else:
            continue

        # if variable has an indexing dimension, 
        # get the indexing dimension and the coords
        vdims = []
        vcoords = {}
        if v.name in model.RV_dims:
            vdims = list(model.RV_dims[v.name])
            for dim in vdims:
                if dim in model.coords:
                    vcoords[dim] = list(map(str, list(model.coords[dim])))
            
        # if the variable is a distribution, describe the distribution
        if hasattr(v, "distribution"):
            distribution = describe_distribution(v.distribution)
        else:
            distribution = {}

        variable_descriptor[k] = {
            "name": v.name,
            "type": vtype,
            "parents": dag.get(k, []),
            "size": int(size),
            "dims": vdims,
            "coords": vcoords,
            "distribution": distribution,
        }
    return variable_descriptor

