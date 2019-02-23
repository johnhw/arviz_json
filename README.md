# arviz_json
Exports ARViz `InferenceData` to JSON + binary npy arrays for client-side use. Intended to make it possible to access the outputs of Bayesian inference in interactive JS applications in the browser. This packages up the data in the NetCDF block into a zip file containing JSON
metadata, and a collection of `npy` format arrays. A loader to unpack this format in JavaScript is provided.

## DAG extraction
The module includes functionality to extract a very basic skeleton of the DAG from PyMC3, giving the parents of each variable and basic information about dimension and distribution type, and can package this alongside the model.

## Example

```python
     with model:
        # Get posterior trace, prior trace, posterior predictive samples, and the DAG
        trace = pm.sample(samples=samples, chains=chains)
        prior = pm.sample_prior_predictive(samples=samples)
        posterior_predictive = pm.sample_posterior_predictive(trace, predictive_samples, model)
        dag = get_dag(model)
    
    data = az.from_pymc3(
        trace=trace, prior=prior, posterior_predictive=posterior_predictive
    )

    # insert dag into sampler stat attributes
    data.sample_stats.attrs["graph"] = dag
    arviz_to_json(data, "switchpoint.npz")
```    
And this data can then can be loaded in-browser:

```javascript
    load_npz("switchpoint.npz", function(arviz_data)
            {
                console.log(arviz_data.header); // the header data
                console.log(arviz_data.arrays); // the numeric arrays                
            });      

```