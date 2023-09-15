from typing import List
import os
import yaml
import time
from pathlib import Path
import shutil
import multiprocessing
from .init_compute_resource_node import env_var_keys
from ..sdk.App import App
from ..sdk._post_api_request import _post_api_request
from ..sdk._run_job import _set_job_status
from .PubsubClient import PubsubClient
from .crypto_keys import sign_message
from ..sdk.App import App
from ._start_job import _start_job


max_simultaneous_local_jobs = 2

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

        print('Getting pubsub info')
        pubsub_subscription = get_pubsub_subscription(compute_resource_id=self._compute_resource_id, compute_resource_private_key=self._compute_resource_private_key)
        self._pubsub_client = PubsubClient(
            pubnub_subscribe_key=pubsub_subscription['pubnubSubscribeKey'],
            pubnub_channel=pubsub_subscription['pubnubChannel'],
            pubnub_user=pubsub_subscription['pubnubUser'],
            compute_resource_id=self._compute_resource_id
        )
    def start(self):
        timer_handle_jobs = 0

        # Start cleaning up old job directories
        # It's important to do this in a separate process
        # because it can take a long time to delete all the files in the tmp directories (remfile is the culprit)
        # and we don't want to block the main process from handling jobs
        multiprocessing.Process(target=_cleanup_old_job_working_directories, args=(os.getcwd() + '/jobs',)).start()

        print('Starting compute resource')
        while True:
            elapsed_handle_jobs = time.time() - timer_handle_jobs
            need_to_handle_jobs = elapsed_handle_jobs > 60
            messages = self._pubsub_client.take_messages()
            for msg in messages:
                if msg['type'] == 'newPendingJob':
                    need_to_handle_jobs = True
                if msg['type'] == 'jobStatusChaged':
                    need_to_handle_jobs = True
            if need_to_handle_jobs:
                timer_handle_jobs = time.time()
                self._handle_jobs()
            time.sleep(1)
    def _handle_jobs(self):
        signature = sign_message({'type': 'computeResource.getUnfinishedJobs'}, self._compute_resource_id, self._compute_resource_private_key)
        req = {
            'type': 'computeResource.getUnfinishedJobs',
            'computeResourceId': self._compute_resource_id,
            'signature': signature,
            'nodeId': self._node_id,
            'nodeName': self._node_name
        }
        resp = _post_api_request(req)
        jobs = resp['jobs']

        # Local jobs
        local_jobs = [job for job in jobs if self._is_local_job(job)]
        num_non_pending_local_jobs = len([job for job in local_jobs if job['status'] != 'pending'])
        if num_non_pending_local_jobs < max_simultaneous_local_jobs:
            pending_local_jobs = [job for job in local_jobs if job['status'] == 'pending']
            pending_local_jobs = _sort_jobs_by_timestamp_created(pending_local_jobs)
            num_to_start = min(max_simultaneous_local_jobs - num_non_pending_local_jobs, len(pending_local_jobs))
            local_jobs_to_start = pending_local_jobs[:num_to_start]
            for job in local_jobs_to_start:
                self._start_job(job)
        
        # AWS Batch jobs
        aws_batch_jobs = [job for job in jobs if self._is_aws_batch_job(job)]
        for job in aws_batch_jobs:
            self._start_job(job)
    def _get_job_resource_type(self, job: dict) -> str:
        processor_name = job['processorName']
        app: App = self._find_app_with_processor(processor_name)
        if app is None:
            return None
        if app._aws_batch_job_queue is not None:
            return 'aws_batch'
        else:
            return 'local'
    def _is_local_job(self, job: dict) -> bool:
        return self._get_job_resource_type(job) == 'local'
    def _is_aws_batch_job(self, job: dict) -> bool:
        return self._get_job_resource_type(job) == 'aws_batch'
    def _start_job(self, job: dict):
        job_id = job['jobId']
        job_private_key = job['jobPrivateKey']
        processor_name = job['processorName']
        app = self._find_app_with_processor(processor_name)
        if app is None:
            msg = f'Could not find app with processor name {processor_name}'
            print(msg)
            _set_job_status(job_id=job_id, job_private_key=job_private_key, status='failed', error=msg)
            return
        try:
            print(f'Starting job {job_id} {processor_name}')
            _start_job(
                job_id=job_id,
                job_private_key=job_private_key,
                processor_name=processor_name,
                app=app
            )
        except Exception as e:
            msg = f'Failed to start job: {str(e)}'
            print(msg)
            _set_job_status(job_id=job_id, job_private_key=job_private_key, status='failed', error=msg)

    def _find_app_with_processor(self, processor_name: str) -> App:
        for app in self._apps:
            for p in app._processors:
                if p._name == processor_name:
                    return app
        return None

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
        container = a.get('container', None)
        aws_batch = a.get('awsBatch', None)
        s = []
        if container is not None:
            s.append(f'container: {container}')
        if aws_batch is not None:
            aws_batch_job_queue = aws_batch.get('jobQueue', None)
            aws_batch_job_definition = aws_batch.get('jobDefinition', None)
            s.append(f'awsBatchJobQueue: {aws_batch_job_queue}')
            s.append(f'awsBatchJobDefinition: {aws_batch_job_definition}')
        else:
            aws_batch_job_queue = None
            aws_batch_job_definition = None
        print(f'Loading app {a["executablePath"]} | {" | ".join(s)}')
        app = App.from_executable(
            a['executablePath'],
            container=container,
            aws_batch_job_queue=aws_batch_job_queue,
            aws_batch_job_definition=aws_batch_job_definition
        )
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
    daemon.start()

def get_pubsub_subscription(*, compute_resource_id: str, compute_resource_private_key: str) -> str:
    signature = sign_message({'type': 'computeResource.getPubsubSubscription'}, compute_resource_id, compute_resource_private_key)
    req = {
        'type': 'computeResource.getPubsubSubscription',
        'computeResourceId': compute_resource_id,
        'signature': signature
    }
    resp = _post_api_request(req)
    return resp['subscription']

def _sort_jobs_by_timestamp_created(jobs: List[dict]) -> List[dict]:
    return sorted(jobs, key=lambda job: job['timestampCreated'])

def _cleanup_old_job_working_directories(dir: str):
    """Delete working dirs that are more than 24 hours old"""
    jobs_dir = Path(dir)
    while True:
        if not jobs_dir.exists():
            continue
        for job_dir in jobs_dir.iterdir():
            if job_dir.is_dir():
                elapsed = time.time() - job_dir.stat().st_mtime
                if elapsed > 24 * 60 * 60:
                    print(f'Removing old working dir {job_dir}')
                    shutil.rmtree(job_dir)
        time.sleep(60)