import os
import yaml
import time
from pathlib import Path
import shutil
from .init_compute_resource_node import env_var_keys
from ..sdk.App import App
from ..sdk._post_api_request import _post_api_request
from .RunningJob import RunningJob
from .run_job import _set_job_status
from .PubsubClient import PubsubClient
from .crypto_keys import sign_message


max_simultaneous_jobs = 2

class Daemon:
    def __init__(self, *, dir: str):
        self._compute_resource_id = os.getenv('COMPUTE_RESOURCE_ID', None)
        self._compute_resource_private_key = os.getenv('COMPUTE_RESOURCE_PRIVATE_KEY', None)
        self._node_id = os.getenv('NODE_ID', None)
        self._node_name = os.getenv('NODE_NAME', None)
        if self._compute_resource_id is None:
            raise ValueError('Compute resource has not been initialized in this directory, and the environment variable COMPUTE_RESOURCE_ID is not set.')
        if self._compute_resource_private_key is None:
            raise ValueError('Compute resource has not been initialized in this directory, and the environment variable COMPUTE_RESOURCE_PRIVATE_KEY is not set.')
        self._apps = _load_apps(compute_resource_id=self._compute_resource_id, compute_resource_private_key=self._compute_resource_private_key)

        print(f'Loaded apps: {", ".join([app._name for app in self._apps])}')

        spec_apps = []
        for app in self._apps:
            spec_apps.append(app.get_spec())

        # Report the compute resource spec
        print('Reporting the compute resource spec')
        req = {
            'type': 'computeResource.setSpec',
            'computeResourceId': self._compute_resource_id,
            'signature': sign_message({'type': 'computeResource.setSpec'}, self._compute_resource_id, self._compute_resource_private_key),
            'spec': {
                'apps': spec_apps
            }
        }
        _post_api_request(req)

        self._running_jobs: list[RunningJob] = []
        print('Getting pubsub info')
        pubsub_subscription = get_pubsub_subscription(compute_resource_id=self._compute_resource_id, compute_resource_private_key=self._compute_resource_private_key)
        self._pubsub_client = PubsubClient(
            pubnub_subscribe_key=pubsub_subscription['pubnubSubscribeKey'],
            pubnub_channel=pubsub_subscription['pubnubChannel'],
            pubnub_user=pubsub_subscription['pubnubUser']
        )
    def start(self):
        timer_check_new_jobs = 0
        timer_cleanup_old_working_dirs = 0
        print('Starting compute resource')
        while True:
            self._check_for_dead_jobs()
            num_running_jobs = len(self._running_jobs)
            if num_running_jobs < max_simultaneous_jobs:
                elapsed = time.time() - timer_check_new_jobs
                need_to_check_for_new_jobs = elapsed > 60
                messages = self._pubsub_client.take_messages()
                for msg in messages:
                    if msg['type'] == 'newPendingJob':
                        need_to_check_for_new_jobs = True
                if need_to_check_for_new_jobs:
                    timer_check_new_jobs = time.time()
                    self._check_for_new_jobs()
            elapsed = time.time() - timer_cleanup_old_working_dirs
            if elapsed > 300:
                timer_cleanup_old_working_dirs = time.time()
                self._cleanup_old_working_dirs()
            time.sleep(0.1)
    def cleanup(self):
        for job in self._running_jobs:
            if job.is_alive():
                job.cleanup()
    def _check_for_dead_jobs(self):
        for job in self._running_jobs:
            if not job.is_alive():
                print(f'Removing dead job {job._job_id} {job._processor_name}')
                self._running_jobs.remove(job)
    def _check_for_new_jobs(self):
        signature = sign_message({'type': 'computeResource.getPendingJobs'}, self._compute_resource_id, self._compute_resource_private_key)
        req = {
            'type': 'computeResource.getPendingJobs',
            'computeResourceId': self._compute_resource_id,
            'signature': signature,
            'nodeId': self._node_id,
            'nodeName': self._node_name
        }
        resp = _post_api_request(req)
        for job in resp['jobs']:
            job_id = job['jobId']
            job_private_key = job['jobPrivateKey']
            processor_name = job['processorName']
            app = self._find_app_with_processor(processor_name)
            if app is not None:
                print(f'Starting job {job_id} {processor_name}')
                running_job = RunningJob(job_id=job_id, job_private_key=job_private_key, app=app, processor_name=processor_name)
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
    def _cleanup_old_working_dirs(self):
        """Delete working dirs that are more than 24 hours old"""
        jobs_dir = Path(os.getcwd()) / 'jobs'
        if not jobs_dir.exists():
            return
        for job_dir in jobs_dir.iterdir():
            if job_dir.is_dir():
                elapsed = time.time() - job_dir.stat().st_mtime
                if elapsed > 24 * 60 * 60:
                    print(f'Removing old working dir {job_dir}')
                    shutil.rmtree(job_dir)

def _load_apps(*, compute_resource_id: str, compute_resource_private_key: str):
    signature = sign_message({'type': 'computeResource.getApps'}, compute_resource_id, compute_resource_private_key)
    req = {
        'type': 'computeResource.getApps',
        'computeResourceId': compute_resource_id,
        'signature': signature
    }
    resp = _post_api_request(req)
    ret = []
    for a in resp['apps']:
        print(f'Loading app {a["executablePath"]}')
        app = App.from_executable(a['executablePath'])
        print(f'  {len(app._processors)} processors')
        ret.append(app)
    return ret

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
    try:
        daemon.start()
    finally:
        daemon.cleanup()

def get_pubsub_subscription(*, compute_resource_id: str, compute_resource_private_key: str) -> str:
    signature = sign_message({'type': 'computeResource.getPubsubSubscription'}, compute_resource_id, compute_resource_private_key)
    req = {
        'type': 'computeResource.getPubsubSubscription',
        'computeResourceId': compute_resource_id,
        'signature': signature
    }
    resp = _post_api_request(req)
    return resp['subscription']