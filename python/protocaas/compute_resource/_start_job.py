import os
import subprocess
from ..sdk.App import App
from ..sdk._post_api_request import _post_api_request
from ._run_job_in_aws_batch import _run_job_in_aws_batch


def _set_job_status_to_starting(*,
    job_id: str,
    job_private_key: str
):
    req = {
        'type': 'processor.setJobStatus',
        'jobId': job_id,
        'jobPrivateKey': job_private_key,
        'status': 'starting'
    }
    resp = _post_api_request(req)
    if not resp['success']:
        raise Exception(f'Error setting job status to starting: {resp["error"]}')

def _start_job(*,
    job_id: str,
    job_private_key: str,
    processor_name: str,
    app: App,
    run_process: bool = True,
    return_shell_command: bool = False
):
    if return_shell_command and run_process:
        raise Exception('Cannot set both run_process and return_shell_command to True')
    if not return_shell_command and not run_process:
        raise Exception('Cannot set both run_process and return_shell_command to False')

    _set_job_status_to_starting(
        job_id=job_id,
        job_private_key=job_private_key
    )
    if not hasattr(app, '_executable_path'):
        raise Exception(f'App does not have an executable path')
    executable_path: str = app._executable_path
    container: str = app._executable_container
    aws_batch_job_queue: str = app._aws_batch_job_queue
    aws_batch_job_definition: str = app._aws_batch_job_definition
    slurm_opts: dict = app._slurm_opts

    if slurm_opts is not None:
        if run_process:
            raise Exception('Not expecting to see slurm_opts here')

    if aws_batch_job_queue is not None:
        if return_shell_command:
            raise Exception('Cannot return shell command for AWS Batch job')
        if aws_batch_job_definition is None:
            raise Exception(f'aws_batch_job_queue is set but aws_batch_job_definition is not set')
        if not container:
            raise Exception(f'aws_batch_job_queue is set but container is not set')
        print(f'Running job in AWS Batch: {job_id} {processor_name} {aws_batch_job_queue} {aws_batch_job_definition}')
        try:
            _run_job_in_aws_batch(
                job_id=job_id,
                job_private_key=job_private_key,
                aws_batch_job_queue=aws_batch_job_queue,
                aws_batch_job_definition=aws_batch_job_definition,
                container=container, # for verifying consistent with job definition
                command=executable_path # for verifying consistent with job definition
            )
        except Exception as e:
            raise Exception(f'Error running job in AWS Batch: {e}')
        return

    # Note for future: it is not necessary to use a working dir if the job is to run in a container
    working_dir = os.getcwd() + '/jobs/' + job_id
    os.makedirs(working_dir, exist_ok=True)

    if not container:
        if run_process:
            print(f'Running: {executable_path}')
            process = subprocess.Popen(
                [executable_path],
                cwd=working_dir,
                start_new_session=True, # This is important so it keeps running even if the compute resource is stopped
                # Important to set output to devnull so that we don't get a broken pipe error if this parent process is closed
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env={
                    **os.environ,
                    'PYTHONUNBUFFERED': '1',
                    'JOB_ID': job_id,
                    'JOB_PRIVATE_KEY': job_private_key,
                    'APP_EXECUTABLE': executable_path
                }
            )
        elif return_shell_command:
            return f'cd {working_dir} && PYTHONUNBUFFERED=1 JOB_ID={job_id} JOB_PRIVATE_KEY={job_private_key} APP_EXECUTABLE={executable_path} {executable_path}'
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
                '-e', f'JOB_ID={job_id}',
                '-e', f'JOB_PRIVATE_KEY={job_private_key}',
                '-e', f'APP_EXECUTABLE={executable_path}',
                container,
                executable_path
            ]
            if run_process:
                print(f'Running: {" ".join(cmd2)}')
                process = subprocess.Popen(
                    cmd2,
                    cwd=working_dir,
                    start_new_session=True, # This is important so it keeps running even if the compute resource is stopped
                    # Important to set output to devnull so that we don't get a broken pipe error if this parent process is closed
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            elif return_shell_command:
                return f'cd {working_dir} && {" ".join(cmd2)}'
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
                '--env', f'JOB_ID={job_id}',
                '--env', f'JOB_PRIVATE_KEY={job_private_key}',
                '--env', f'APP_EXECUTABLE={executable_path}',
                f'docker://{container}',
                executable_path
            ]
            if run_process:
                print(f'Running: {" ".join(cmd2)}')
                process = subprocess.Popen(
                    cmd2,
                    cwd=working_dir,
                    start_new_session=True, # This is important so it keeps running even if the compute resource is stopped
                    # Important to set output to devnull so that we don't get a broken pipe error if this parent process is closed
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            elif return_shell_command:
                return f'cd {working_dir} && {" ".join(cmd2)}'
        else:
            raise Exception(f'Unexpected container method: {container_method}')
    
    # This was the method used previously when we wanted to capture the output of the process and display it to the console
    # However, that was problematic, because when this parent closes, we don't want a broken pipe
    # prefix = f'{job_id} {processor_name}: '
    # t1 = threading.Thread(target=stream_output, args=(process.stdout, prefix))
    # t1.start()
    # prefix = f'{job_id} {processor_name} ERR: '
    # t2 = threading.Thread(target=stream_output, args=(process.stderr, prefix))
    # t2.start()

# previously did this (see above)
# def stream_output(pipe, prefix: str):
#     while True:
#         try:
#             line = pipe.readline()
#         except:
#             break
#         if line:
#             print(prefix + line.decode('utf-8'))
#         else:
#             break