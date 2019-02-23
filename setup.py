from setuptools import setup

with open("README.md") as f:
   readme = f.read()


setup(
     name='arviz_json',    # This is the name of your PyPI-package.
     version='0.0.1',                          # Update the version number for new releases
     packages=['arviz_json'],                  # The name of your scipt, and also the command you'll be using for calling it
     description = 'An ARViz InferenceData to JSON/npy converter',
     author = 'John H Williamson',
     long_description_content_type="text/markdown",
     long_description=readme,
     author_email = 'johnhw@gmail.com',
     url = 'https://github.com/johnhw/arviz_json', # use the URL to the github repo
    download_url = 'https://github.com/johnhw/arviz_json/tarball/0.1',
    keywords=["arviz", "probabilistic", "javascript", "probabilistic programming", 
    "inference", "json", "inferencedata"]
 )