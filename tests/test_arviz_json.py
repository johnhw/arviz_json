import pytest

from arviz_json import arviz_to_json, fix_dtype, write_for_js, get_dag
import numpy as np

def test_fix_dtype():
    for dtype in ["|u1", "|i1", "<u2", "<u4", "<i4", "<f4", "<f8"]:
        for n in range(3):
            test_array = np.zeros((n+1,n+1), dtype=dtype)
            assert(fix_dtype(test_array).dtype.str==dtype)

    test_array = np.zeros((3,3), dtype='<i8')
    assert(fix_dtype(test_array).dtype.str=='<f8')

    test_array = np.zeros((3,3), dtype='<u8')
    assert(fix_dtype(test_array).dtype.str=='<f8')

    test_array = np.zeros((3,3), dtype='|b1')
    assert(fix_dtype(test_array).dtype.str=='|i1')

    test_array = np.zeros((3,3), dtype='|b')
    assert(fix_dtype(test_array).dtype.str=='|i1')

    test_array = np.zeros((3,3), dtype='|?')
    assert(fix_dtype(test_array).dtype.str=='|i1')

def test_arviz_to_json():
    import arviz as az
    
    data = az.load_arviz_data("centered_eight")
    arviz_to_json(data, "centered_eight.npz")    
    check_zip('centered_eight.npz')

def check_zip(fname):
    import zipfile, json
    with open(fname, "rb") as f:
        z = zipfile.ZipFile(f)
        elements = z.namelist()
        assert("header.json" in elements)
        z.extract("header.json")
        with open("header.json") as json_f:
            json.load(json_f)
    arrays = np.load(fname) 
    return arrays       


def test_write_for_js():
    test_dict = {"test":True}
    test_arrays = {"array_1":np.zeros((4,5)), 
                   "array_2":np.ones(400,),
                   "array_3":np.zeros(40, dtype=np.int8),
                   "array_4":np.full((8,8), 17.0, dtype=np.int8),
                   "array_5":np.full((2,3,2), 1700.0, dtype=np.int64),
                   }
    write_for_js("test.npz", test_dict, test_arrays)        
    arrays = check_zip("test.npz")
    for k in test_arrays:
        assert(np.allclose(arrays[k], test_arrays[k]))

    write_for_js("test.npz", test_dict, test_arrays, compressed=True, verbose=False)        
    check_zip("test.npz")

    write_for_js("test.npz", test_dict, test_arrays, compressed=False, verbose=False)        
    check_zip("test.npz")

    write_for_js("test.npz", test_dict, test_arrays, compressed=False, verbose=True)        
    check_zip("test.npz")

    write_for_js("test.npz", test_dict, test_arrays, compressed=True, verbose=True)        
    check_zip("test.npz")
    

def test_extract_dag():
    import pymc3 as pm
    model = pm.Model()
    # test empty model
    dag = get_dag(model)
    assert(len(dag)==0)
    
    # 3 basic variables
    with model:
        left_slope = pm.Normal("left_slope", mu=0, sd=0.5)
        right_slope = pm.Normal("right_slope", mu=0, sd=0.5)
        switchpoint = pm.Normal("switchpoint", mu=0, sd=100)
    dag = get_dag(model)
    assert(len(dag)==3)

    with model:
        y_obs = pm.Normal("y_obs", mu=switchpoint, sd = left_slope, observed = np.ones((10,)))
        rescaled = pm.Deterministic("rescaled", np.log(np.abs(left_slope)))
        penalty = pm.Potential("potential", right_slope)

    # check all six nodes are accounted for
    dag = get_dag(model)
    assert(len(dag)==6)

    # check parents
    assert("left_slope" in dag["y_obs"]["parents"])
    assert("switchpoint" in dag["y_obs"]["parents"])
    assert("left_slope" in dag["rescaled"]["parents"])
    assert("right_slope" not in dag["y_obs"]["parents"])
    # check variable types
    assert(dag["left_slope"]["type"]=='free')
    assert(dag["y_obs"]["type"]=='observed')
    assert(dag["potential"]["type"]=='potential')
    assert(dag["rescaled"]["type"]=='deterministic')
    
    assert(dag["y_obs"]["distribution"]["type"]=='Normal')
    assert(dag["left_slope"]["distribution"]["type"]=='Normal')

    