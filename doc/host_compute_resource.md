# Hosting a compute resource

Each Protocaas workspace comes equipped with a dedicated compute resource for executing analysis jobs. The default setting uses a cloud resource provided by the author with specific limitations on CPU, memory, and concurrent jobs, shared among all users. This public resource should not be used for intensive processing. Users can link their own compute resources to their workspaces.

Prerequisites

* Python >= 3.9
* Docker or (Singularity >= 3.11)

Clone this repo, then

```bash
# install
cd protocaas/python
pip install -e .
```

```bash
# Initialize (one time)
export COMPUTE_RESOURCE_DIR=/some/path
export CONTAINER_METHOD=singularity # or docker
cd $COMPUTE_RESOURCE_DIR
protocaas init-compute-resource-node
# Open the provided link in a browser and log in using GitHub
```

```bash
# Start the compute resource
cd $COMPUTE_RESOURCE_DIR
protocaas start-compute-resource-node
# Leave this open in a terminal
```

In the web interface, go to settings for your workspace, and select your compute resource. New analyses within your workspace will now use your compute resource for analysis jobs.