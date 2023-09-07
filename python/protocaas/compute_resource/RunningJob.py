import subprocess
import threading
import os
import signal
from ..sdk.App import App
from ..sdk._post_api_request import _post_api_request


class RunningJob:
    def __init__(self, *, job_id: str, job_private_key: str, app: App, processor_name: str):
        self._job_id = job_id
        self._job_private_key = job_private_key
        self._app = app
        self._process = None
        self._processor_name = processor_name
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

        # Note for future: it is not necessary to use a working dir if the job is to run in a container
        working_dir = os.getcwd() + '/jobs/' + self._job_id
        os.makedirs(working_dir, exist_ok=True)

        cmd = ['protocaas', 'run-job', '--job-id', self._job_id, '--job-private-key', self._job_private_key, '--executable-path', executable_path]
        self._process = subprocess.Popen(
            cmd,
            cwd=working_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}
        )
        prefix = f'{self._job_id} {self._processor_name}: '
        t1 = threading.Thread(target=stream_output, args=(self._process.stdout, prefix))
        t1.start()
        prefix = f'{self._job_id} {self._processor_name} ERR: '
        t2 = threading.Thread(target=stream_output, args=(self._process.stderr, prefix))
        t2.start()
    def cleanup(self):
        if self._process is not None:
            if not self.is_alive():
                return
            print(f'Killing process for job {self._job_id}')
            self._process.kill()
            self._process.stdout.close()
            self._process.stderr.close()
    def is_alive(self):
        return self._process.poll() is None
    def retcode(self):
        return self._process.poll()

def stream_output(pipe, prefix: str):
    while True:
        try:
            line = pipe.readline()
        except:
            break
        if line:
            print(prefix + line.decode('utf-8'))
        else:
            break