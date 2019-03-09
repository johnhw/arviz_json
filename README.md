# arviz_json
Exports [ARViz](https://arviz-devs.github.io/arviz/) [`InferenceData`](https://arviz-devs.github.io/arviz/notebooks/XarrayforArviZ.html) to JSON + binary npy arrays for client-side use. Intended to make it possible to access the outputs of Bayesian inference in interactive JS applications in the browser. This packages up the data in the NetCDF/xarray block into a zip file containing JSON metadata, and a collection of `npy` format arrays. A loader to unpack this format in Javascript is provided.

Multiple models can be packed into a single zip file using `multi_arviz_to_json()` which can be conveniently loaded in the browser.

## DAG extraction
The module also includes functionality to extract a very basic skeleton of the DAG from [PyMC3](https://docs.pymc.io/), giving the parents of each variable and basic information about dimension and distribution type, and can package this alongside the model.

## Example

```python
    from arviz_json import get_dag, arviz_to_json

    ...

    with model:
        # Get posterior trace, prior trace, posterior predictive samples, and the DAG
        trace = pm.sample(samples=samples, chains=chains)
        prior = pm.sample_prior_predictive(samples=samples)
        posterior_predictive = pm.sample_posterior_predictive(trace, predictive_samples, model)
        dag = get_dag(model)
    
    data = az.from_pymc3(trace=trace, prior=prior, posterior_predictive=posterior_predictive)

    # insert variable graph into sampler stat attributes
    data.sample_stats.attrs["graph"] = dag
    arviz_to_json(data, "switchpoint.npz")
```    
And this data can then can be loaded in-browser:

```javascript
    load_npz("switchpoint.npz").then(function(npz_data)
            {
                arviz_data = reassemble_arviz(npz_data);
                console.log(arviz_data.observed); // observations
                console.log(arviz_data.posterior); // posterior samples
                console.log(arviz_data.prior); // prior samples
                console.log(arviz_data.sample_stats); // statistics
                console.log(arviz_data.sample_stats.dag); // graph of model
                console.log(arviz_data.posterior_predictive); // p. predictive samples
                
            });      

```
