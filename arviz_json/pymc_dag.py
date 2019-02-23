import pymc3 as pm
from pprint import pprint
from arviz_json import arviz_to_json

def describe_distribution(d):
    return {"type": d.__class__.__name__, "shape": list(d.shape)}  # distribution

def get_dag(model):
    variable_descriptor = {}

    variables = model.named_vars
    # get the DAG for this graph
    graph = pm.model_graph.ModelGraph(model)
    dag = graph.make_compute_graph()
    dag = {k: list(v) for k, v in dag.items()}

    for k, v in variables.items():
        vtype = "unknown"
        size = 0
        data_shape = ()

        descriptor = {}

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


if __name__=="__main__":
    import pandas as pd
    import theano.tensor as tt
    import arviz as az
    from io import StringIO

    # load data from a string

    data = StringIO("""year,poverty_rate
    1819.8097502972653, 83.88791593695271
    1849.6789536266351, 81.646234676007
    1869.655172413793, 75.48161120840629
    1889.821640903686, 71.6987740805604
    1909.6076099881093, 65.67425569176883
    1928.8228299643283, 56.42732049036777
    1949.7502972651605, 54.8861646234676
    1959.6432818073722, 44.09807355516638
    1969.7265160523186, 35.69176882661996
    1979.8097502972653, 31.62872154115587
    1991.6052318668253, 23.782837127845866
    2004.922711058264, 13.695271453590195
    2001.8787158145064, 17.19789842381782
    1999.0249702734839, 19.159369527145344
    1995.9809750297266, 19.299474605954472
    1987.0392390011891, 24.483362521891436
    1989.8929845422117, 24.483362521891436
    1983.9952437574316, 27.98598949211906
    1980.9512485136743, 33.450087565674266
    1992.936979785969, 22.521891418563897""")

    poverty = pd.read_csv(data)
    mean_prate = 50.0 
    mean_year = 1960 
    draws = 1000
    chains = 4
    switch_model = pm.Model()
    with switch_model:    
        year = pm.Normal("year", mu=0, sd=1, observed=poverty["year"]-mean_year)
        # 3 betas
        poverty_at_switchpoint = pm.Normal("poverty_at_switchpoint", mu=0, sd=20.0)

        left_slope = pm.Normal("left_slope", mu=0, sd=1)
        right_slope = pm.Normal("right_slope", mu=0, sd=1)
        switchpoint = pm.Normal("switchpoint", mu=0, sd=100)

        lik = pm.Deterministic("llik", switch_model.logpt)        
        switch_value = (tt.tanh(1.0 * (switchpoint - year)) + 1) / 2.0


        switch_value = (switch_value * (poverty_at_switchpoint+left_slope*(year-switchpoint)) +
        (1-switch_value) * (poverty_at_switchpoint+right_slope*(year-switchpoint)))                          
        sigma = pm.HalfNormal("sigma", sd=5)
        y = pm.Normal("y", mu=switch_value, sd=sigma, observed=poverty["poverty_rate"]-mean_prate)

        trace = pm.sample(draws, chains=chains)
        prior = pm.sample_prior_predictive()
        posterior_predictive = pm.sample_posterior_predictive(trace, 500, switch_model)            
        dag = get_dag(switch_model)

        data = az.from_pymc3(trace=trace,
            prior=prior,
            posterior_predictive=posterior_predictive
            )

        # insert dag into sampler stat attributes
        data.sample_stats.attrs["graph"] = dag
        arviz_to_json(data, "switchpoint")