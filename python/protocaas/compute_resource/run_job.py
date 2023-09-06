import os
import threading
import queue
import time
import subprocess
from ..sdk._post_api_request import _post_api_request
from ..sdk.InputFile import InputFile
from ..sdk.OutputFile import OutputFile


# This function is called internally by the compute resource daemin through the protocaas CLI
# * Sets the job status to running in the database via the API
# * Runs the job in a separate process by calling the app executable with the appropriate env vars
# * Monitors the job output, updating the database periodically via the API
# * Sets the job status to completed or failed in the database via the API

def run_job(*, job_id: str, job_private_key: str, app_executable: str):
    _set_job_status(job_id=job_id, job_private_key=job_private_key, status='running')

    cmd = app_executable
    env = os.environ.copy()
    env['JOB_ID'] = job_id
    env['JOB_PRIVATE_KEY'] = job_private_key
    proc = subprocess.Popen(
        cmd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT
    )

    def output_reader(proc, outq: queue.Queue):
        while True:
            x = proc.stdout.read(1)
            if len(x) == 0:
                break
            outq.put(x)
    outq = queue.Queue()
    output_reader_thread = threading.Thread(target=output_reader, args=(proc, outq))
    output_reader_thread.start()

    all_output = b''
    last_newline_index_in_output = -1
    last_report_console_output_time = time.time()
    console_output_changed = False
    last_check_job_exists_time = time.time()

    succeeded = False
    try:
        while True:
            try:
                retcode = proc.wait(1)
                if retcode != 0:
                    raise ValueError(f'Error running job: {retcode}')
                break
            except subprocess.TimeoutExpired:
                pass
            while True:
                try:
                    x = outq.get(block=False)
                    print(x.decode('utf-8'), end='')

                    if x == b'\n':
                        last_newline_index_in_output = len(all_output)
                    if x == b'\r':
                        # handle carriage return (e.g. in progress bar)
                        all_output = all_output[:last_newline_index_in_output + 1]
                    all_output += x
                    console_output_changed = True
                except queue.Empty:
                    break
            
            if console_output_changed:
                elapsed = time.time() - last_report_console_output_time
                if elapsed > 10:
                    last_report_console_output_time = time.time()
                    console_output_changed = False
                    _set_job_console_output(job_id=job_id, job_private_key=job_private_key, console_output=all_output.decode('utf-8'))

            elapsed = time.time() - last_check_job_exists_time
            if elapsed > 60:
                last_check_job_exists_time = time.time()
                # this should throw an exception if the job does not exist
                job_status = _get_job_status(job_id=job_id, job_private_key=job_private_key)
                if job_status != 'running':
                    raise ValueError(f'Unexpected job status: {job_status}')
        succeeded = True # No exception
    except Exception as e:
        succeeded = False
        error_message = str(e)
    finally:
        output_reader_thread.join()
        try:
            proc.stdout.close()
            proc.terminate()
        except Exception:
            pass
    
    if succeeded:
        _set_job_status(job_id=job_id, job_private_key=job_private_key, status='completed')
    else:
        _set_job_status(job_id=job_id, job_private_key=job_private_key, status='failed', error=error_message)

def _get_job_status(*, job_id: str, job_private_key: str) -> str:
    """Get a job from the protocaas API"""
    req = {
        'type': 'processor.getJob',
        'jobId': job_id,
        'jobPrivateKey': job_private_key
    }
    res = _post_api_request(req)
    return res['status']

def _set_job_status(*, job_id: str, job_private_key: str, status: str, error: str = None):
    """Set the status of a job in the protocaas API"""
    req = {
        'type': 'processor.setJobStatus',
        'jobId': job_id,
        'jobPrivateKey': job_private_key,
        'status': status
    }
    if error is not None:
        req['error'] = error
    resp = _post_api_request(req)
    if not resp['success']:
        raise Exception(f'Error setting job status: {resp["error"]}')

def _set_job_console_output(*, job_id: str, job_private_key: str, console_output: str):
    """Set the console output of a job in the protocaas API"""
    req = {
        'type': 'processor.setJobConsoleOutput',
        'jobId': job_id,
        'jobPrivateKey': job_private_key,
        'consoleOutput': console_output
    }
    resp = _post_api_request(req)
    if not resp['success']:
        raise Exception(f'Error setting job console output: {resp["error"]}')