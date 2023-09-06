import subprocess
from ..sdk.App import App
from ..sdk._post_api_request import App, _post_api_request


class RunningJob:
    def __init__(self, *, job_id: str, job_private_key: str, app: App):
        self._job_id = job_id
        self._job_private_key = job_private_key
        self._app = app
        self._process = None
    def start(self):
        req = {
            'type': 'processor.setJobStatus',
            'jobId': self._job_id,
            'jobPrivateKey': self._job_private_key,
            'status': 'starting'
        }
        resp = _post_api_request(req)
        if not resp['success']:
            raise Exception(f'Error setting job status to starting: {resp["error"]}')
        if not hasattr(self._app, '_executable_path'):
            raise Exception(f'App does not have an executable path')
        executable_path: str = self._app._executable_path
        cmd = ['protocaas', '--job-id', self._job_id, '--job-private-key', self._job_private_key, '--app-executable', executable_path]
        self._process = subprocess.Popen(cmd)
    def is_alive(self):
        return self._process.poll() is None
    def retcode(self):
        return self._process.poll()