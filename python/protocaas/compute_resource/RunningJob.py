import subprocess
import threading
import os
import tempfile
import shutil
from ..sdk.App import App
from ..sdk._post_api_request import _post_api_request
from ._run_job_in_aws_batch import _run_job_in_aws_batch


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
        container: str = self._app._executable_container
        aws_batch_job_queue: str = self._app._aws_batch_job_queue
        aws_batch_job_definition: str = self._app._aws_batch_job_definition

        if aws_batch_job_queue is not None:
            if aws_batch_job_definition is None:
                raise Exception(f'aws_batch_job_queue is set but aws_batch_job_definition is not set')
            print(f'Running job in AWS Batch: {self._job_id} {aws_batch_job_queue} {aws_batch_job_definition}')
            try:
                _run_job_in_aws_batch(
                    job_id=self._job_id,
                    job_private_key=self._job_private_key,
                    aws_batch_job_queue=aws_batch_job_queue,
                    aws_batch_job_definition=aws_batch_job_definition,
                    app_executable=executable_path,
                    container=container, # for verifying consistent with job definition
                    command=executable_path # for verifying consistent with job definition
                )
            except Exception as e:
                print(f'Error running job in AWS Batch: {e}')
                req = {
                    'type': 'processor.setJobStatus',
                    'jobId': self._job_id,
                    'jobPrivateKey': self._job_private_key,
                    'status': 'failed',
                    'error': str(e)
                }
                resp = _post_api_request(req)
                if not resp['success']:
                    raise Exception(f'Error setting job status to failed: {resp["error"]}')
            return

        # Note for future: it is not necessary to use a working dir if the job is to run in a container
        working_dir = os.getcwd() + '/jobs/' + self._job_id
        os.makedirs(working_dir, exist_ok=True)

        if not container:
            self._process = subprocess.Popen(
                [executable_path],
                cwd=working_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env={
                    **os.environ,
                    'PYTHONUNBUFFERED': '1',
                    'JOB_ID': self._job_id,
                    'JOB_PRIVATE_KEY': self._job_private_key,
                    'APP_EXECUTABLE': executable_path
                }
            )
        else:
            container_method = os.environ.get('CONTAINER_METHOD', 'docker')
            if container_method == 'docker':
                tmpdir = working_dir + '/tmp'
                os.makedirs(tmpdir, exist_ok=True)
                os.makedirs(tmpdir + '/working', exist_ok=True)
                cmd2 = [
                    'docker', 'run', '-it',
                    '-v', f'{tmpdir}:/tmp',
                    '--workdir', '/tmp/working', # the working directory will be /tmp/working
                    '-e', 'PYTHONUNBUFFERED=1',
                    '-e', f'JOB_ID={self._job_id}',
                    '-e', f'JOB_PRIVATE_KEY={self._job_private_key}',
                    '-e', f'APP_EXECUTABLE={executable_path}',
                    container,
                    executable_path
                ]
                print(f'Running: {" ".join(cmd2)}')
                self._process = subprocess.Popen(
                    cmd2,
                    cwd=working_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            elif container_method == 'singularity':
                tmpdir = working_dir + '/tmp' # important to provide a /tmp directory for singularity so that it doesn't run out of disk space
                os.makedirs(tmpdir, exist_ok=True)
                os.makedirs(tmpdir + '/working', exist_ok=True)
                cmd2 = [
                    'singularity', 'exec',
                    '--bind', f'{tmpdir}:/tmp',
                    # The working directory should be /tmp/working so that if the container wants to write to the working directory, it will not run out of space
                    '--pwd', '/tmp/working',
                    '--cleanenv', # this is important to prevent singularity from passing environment variables to the container
                    '--contain', # we don't want singularity to mount the home or tmp directories of the host
                    '--nv',
                    '--env', 'PYTHONUNBUFFERED=1',
                    '--env', f'JOB_ID={self._job_id}',
                    '--env', f'JOB_PRIVATE_KEY={self._job_private_key}',
                    '--env', f'APP_EXECUTABLE={executable_path}',
                    f'docker://{container}',
                    executable_path
                ]
                print(f'Running: {" ".join(cmd2)}')
                self._process = subprocess.Popen(
                    cmd2,
                    cwd=working_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            else:
                raise Exception(f'Unexpected container method: {container_method}')
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
        if self._process is None:
            return False
        return self._process.poll() is None
    def retcode(self):
        if self._process is None:
            return None
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

class TemporaryDirectory:
    """A context manager for temporary directories"""
    def __init__(self):
        self._dir = None
    def __enter__(self):
        self._dir = tempfile.mkdtemp()
        return self._dir
    def __exit__(self, exc_type, exc_value, traceback):
        shutil.rmtree(self._dir)