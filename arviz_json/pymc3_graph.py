# from https://github.com/pymc-devs/pymc3/blob/master/pymc3/model_graph.py
# attempt to extract constant ancestors (i.e. prior specifications) from the
# dag. Unfortunately, there is little metadata, so will also see:
# * arrays, like the observed variables
# * "utility constants", used internally, like pi

import itertools

from theano.gof.graph import ancestors

from pymc3.util import get_default_varnames
import pymc3 as pm

def is_constant(v):
    if v.__class__.__name__.endswith("TensorConstant"):        
        if len(v.shape.eval())==0:
            return True
    return False

def powerset(iterable):
    """All *nonempty* subsets of an iterable.
    From itertools docs.
    powerset([1,2,3]) --> (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)
    """
    s = list(iterable)
    return itertools.chain.from_iterable(itertools.combinations(s, r) for r in range(1, len(s)+1))

class ModelGraph:
    def __init__(self, model):
        self.model = model
        self.var_names = get_default_varnames(self.model.named_vars, include_transformed=False)
        self.var_list = self.model.named_vars.values()
        self.transform_map = {v.transformed: v.name for v in self.var_list if hasattr(v, 'transformed')}
        self._deterministics = None

    def get_deterministics(self, var):
        """Compute the deterministic nodes of the graph"""
        deterministics = []
        attrs = ('transformed', 'logpt')
        for v in self.var_list:
            if v != var and all(not hasattr(v, attr) for attr in attrs):
                deterministics.append(v)
        return deterministics

    def _ancestors(self, var, func, blockers=None):
        """Get ancestors of a function that are also named PyMC3 variables"""
        return set([j for j in ancestors([func], blockers=blockers) if j in self.var_list and j != var])        
        
    # apply constant identification *after* full model graph is computed
    # we then have all nodes at most one level away from the leaves, and we just
    # process each of these to find any constant parents that a node may have
    def _constant_parents(self, var, func):
        return set([float(j.eval()) for j in ancestors([func]) if is_constant(j)])        

    def _get_ancestors(self, var, func):
        """Get all ancestors of a function, doing some accounting for deterministics
        Specifically, if a deterministic is an input, theano.gof.graph.ancestors will
        return only the inputs *to the deterministic*.  However, if we pass in the
        deterministic as a blocker, it will skip those nodes.
        """
        deterministics = self.get_deterministics(var)
        upstream = self._ancestors(var, func)

        # Usual case
        if upstream == self._ancestors(var, func, blockers=upstream):
            return upstream
        else: # deterministic accounting
            for d in powerset(upstream):
                blocked = self._ancestors(var, func, blockers=d)
                if set(d) == blocked:
                    return d
        raise RuntimeError('Could not traverse graph. Consider raising an issue with developers.')

    def _filter_parents(self, var, parents):
        """Get direct parents of a var, as strings"""
        keep = set()
        for p in parents:
                        
            if p == var:
                continue
            elif p.name in self.var_names:
                keep.add(p.name)
            elif p in self.transform_map:
                if self.transform_map[p] != var.name:
                    keep.add(self.transform_map[p])
            else:
                raise AssertionError('Do not know what to do with {}'.format(str(p)))
        return keep

    def get_parents(self, var):
        """Get the named nodes that are direct inputs to the var"""
        if hasattr(var, 'transformed'):
            func = var.transformed.logpt
        elif hasattr(var, 'logpt'):
            func = var.logpt
        else:
            func = var

        parents = self._get_ancestors(var, func)
        return self._filter_parents(var, parents)

    def get_constant_parents(self, var):
        """From a complete graph of variables, take a single variable and return
        all scalar constant parents that this variable has."""
        if hasattr(var, 'transformed'):
            func = var.transformed.logpt
        elif hasattr(var, 'logpt'):
            func = var.logpt
        else:
            func = var
        return set(self._constant_parents(var, func))

    def make_compute_graph(self):
        """Get map of var_name -> set(input var names) for the model"""
        input_map = {}
        for var_name in self.var_names:
            input_map[var_name] = self.get_parents(self.model[var_name])
            # add in constants
            input_map[var_name] = input_map[var_name] | self.get_constant_parents(self.model[var_name])
            
        return input_map

