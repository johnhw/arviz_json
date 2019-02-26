# Example, using a simple piecewise linear regression
import pandas as pd
import theano.tensor as tt
import arviz as az
import pymc3 as pm
from arviz_json import arviz_to_json, get_dag, multi_arviz_to_json
from io import StringIO

def load_data():
    # load data from a string
    return  pd.read_csv(StringIO(
    """year,poverty_rate
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
    1992.936979785969, 22.521891418563897"""
    ))


def define_model(poverty):
    mean_prate = 50.0
    mean_year = 1960
    switch_model = pm.Model()

    with switch_model:
        year = pm.Uniform("year", lower=-150, upper=150, observed=poverty["year"] - mean_year)        
        poverty_at_switchpoint = pm.Normal("poverty_at_switchpoint", mu=0, sd=10.0)

        left_slope = pm.Normal("left_slope", mu=0, sd=0.5)
        right_slope = pm.Normal("right_slope", mu=0, sd=0.5)
        switchpoint = pm.Normal("switchpoint", mu=0, sd=100)

        lik = pm.Deterministic("llik", switch_model.logpt)
        switch_value = (tt.tanh(1.0 * (switchpoint - year)) + 1) / 2.0

        switch_value = switch_value * (
            poverty_at_switchpoint + left_slope * (year - switchpoint)
        ) + (1 - switch_value) * (
            poverty_at_switchpoint + right_slope * (year - switchpoint)
        )

        sigma = pm.HalfCauchy("sigma", 5)
        y = pm.Normal(
            "y",
            mu=switch_value,
            sd=sigma,
            observed=poverty["poverty_rate"] - mean_prate,
        )
    return switch_model


def capture_inference(model, samples=1000, chains=4, predictive=500):
    with model:
        # Get posterior trace, prior trace, posterior predictive samples, and the DAG
        trace = pm.sample(samples=samples, chains=chains)
        prior = pm.sample_prior_predictive(samples=samples)
        posterior_predictive = pm.sample_posterior_predictive(trace)
        
        dag = get_dag(model)

    # will also capture all the sampler statistics
    data = az.from_pymc3(
        trace=trace, prior=prior, posterior_predictive=posterior_predictive
    )

    # insert dag into sampler stat attributes
    data.sample_stats.attrs["graph"] = dag
    return data
    
if __name__=="__main__":
    # generate a single switchpoint model
    poverty = load_data()
    model = define_model(poverty)
    dag = get_dag(model)    
    data = capture_inference(model)
    arviz_to_json(data, "switchpoint.npz")

    # generate multiple models
    models = {
        "centered": az.load_arviz_data("centered_eight"),
        "noncentered": az.load_arviz_data("non_centered_eight"),
    }
    multi_arviz_to_json(models, "multimodel.zip")

