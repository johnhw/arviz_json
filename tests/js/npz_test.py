import numpy as np 

array_1 = np.zeros((5,5))
array_2 = np.zeros((3,30), dtype=np.int32)
array_3 = np.ones((300), dtype=np.float32)
array_4 = np.ones((300, 50, 5))

np.savez("test.npz", alpha=array_1, bravo=array_2, charlie=array_3, delta=array_4)