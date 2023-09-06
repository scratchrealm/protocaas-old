import os
import yaml
import time
from pathlib import Path
from .init_compute_resource_node import env_var_keys
from ..sdk.App import App
from ..sdk._post_api_request import _post_api_request
from .RunningJob import RunningJob
from .run_job import _set_job_status


this_directory = Path(__file__).parent

class Daemon:
    def __init__(self, *, dir: str):
        self._compute_resource_id = os.getenv('COMPUTE_RESOURCE_ID', None)
        self._compute_resource_private_key = os.getenv('COMPUTE_RESOURCE_PRIVATE_KEY', None)
        if self._compute_resource_id is None:
            raise ValueError('Compute resource has not been initialized in this directory, and the environment variable COMPUTE_RESOURCE_ID is not set.')
        if self._compute_resource_private_key is None:
            raise ValueError('Compute resource has not been initialized in this directory, and the environment variable COMPUTE_RESOURCE_PRIVATE_KEY is not set.')
        self._apps = _load_apps(compute_resource_id=self._compute_resource_id, compute_resource_private_key=self._compute_resource_private_key)
        self._running_jobs: list[RunningJob] = []
    def start(self):
        while True:
            self._check_for_dead_jobs()
            self._check_for_new_jobs()
            time.sleep(0.5)
    def _check_for_dead_jobs(self):
        for job in self._running_jobs:
            if not job.is_alive():
                self._running_jobs.remove(job)
    def _check_for_new_jobs(self):
        req = {
            'type': 'computeResource.getPendingJobs',
            'computeResourceId': self._compute_resource_id,
            'computeResourcePrivateKey': self._compute_resource_private_key
        }
        resp = _post_api_request(req)
        for job in resp['jobs']:
            job_id = job['jobId']
            job_private_key = job['jobPrivateKey']
            processor_name = job['processorName']
            app = self._find_app_with_processor(processor_name)
            if app is not None:
                running_job = RunningJob(job_id=job_id, job_private_key=job_private_key, app=app)
                running_job.start()
                self._running_jobs.append(running_job)
            else:
                print(f'Could not find app with processor name {processor_name}')
                _set_job_status(job_id=job_id, job_private_key=job_private_key, status='failed', error=f'Could not find app with processor name {processor_name}')
    def _find_app_with_processor(self, processor_name: str) -> App:
        for app in self._apps:
            for p in app._processors:
                if p._name == processor_name:
                    return app
        return None

def _load_apps(*, compute_resource_id: str, compute_resource_private_key: str):
    req = {
        'type': 'computeResource.getApps',
        'computeResourceId': compute_resource_id,
        'computeResourcePrivateKey': compute_resource_private_key
    }
    resp = _post_api_request(req)
    return [
        App.from_executable(a['executablePath'])
        for a in resp['apps']
    ]

def start_compute_resource_node(dir: str):
    config_fname = os.path.join(dir, '.protocaas-compute-resource-node.yaml')
    
    if os.path.exists(config_fname):
        with open(config_fname, 'r') as f:
            the_config = yaml.safe_load(f)
    else:
        the_config = {}
    for k in env_var_keys:
        if k in the_config:
            os.environ[k] = the_config[k]

    daemon = Daemon(dir=dir)
    daemon.start()