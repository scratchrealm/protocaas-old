from typing import List, Any
import os
import json
import subprocess
import shutil
import tempfile
from dataclasses import dataclass
from .InputFile import InputFile
from .OutputFile import OutputFile
from .AppProcessor import AppProcessor
from ._post_api_request import _post_api_request


@dataclass
class JobParameter:
    """A parameter passed to a job"""
    name: str
    value: Any

@dataclass
class Job:
    """A job that is passed to a processor"""
    job_id: str
    status: str
    processor_name: str
    inputs: List[InputFile]
    outputs: List[OutputFile]
    parameters: List[JobParameter]

class App:
    """An app"""
    def __init__(self, name, *, help: str) -> None:
        self._name = name
        self._help = help
        self._processors: List[AppProcessor] = []
    def add_processor(self, processor_func):
        P = AppProcessor.from_func(processor_func)
        self._processors.append(P)
    def run(self):
        JOB_ID = os.environ.get('JOB_ID', None)
        JOB_PRIVATE_KEY = os.environ.get('JOB_PRIVATE_KEY', None)
        SPEC_OUTPUT_FILE = os.environ.get('SPEC_OUTPUT_FILE', None)
        if SPEC_OUTPUT_FILE is not None:
            if JOB_ID is not None:
                raise Exception('Cannot set both JOB_ID and SPEC_OUTPUT_FILE')
            with open(SPEC_OUTPUT_FILE, 'w') as f:
                json.dump(self.get_spec(), f, indent=4)
            return
        if JOB_ID is not None:
            if JOB_PRIVATE_KEY is None:
                raise Exception('JOB_PRIVATE_KEY is not set')
            return self._run_job(job_id=JOB_ID, job_private_key=JOB_PRIVATE_KEY)
        raise Exception('You must set one of the following environment variables: JOB_ID, SPEC_OUTPUT_FILE')
    def get_spec(self):
        processors = []
        for processor in self._processors:
            processors.append(
                processor.get_spec()
            )
        spec = {
            'name': self._name,
            'help': self._help,
            'processors': processors
        }
        return spec
    @staticmethod
    def from_spec(spec):
        app = App(
            name=spec['name'],
            help=spec['help']
        )
        for processor_spec in spec['processors']:
            processor = AppProcessor.from_spec(processor_spec)
            app._processors.append(processor)
        return app
    @staticmethod
    def from_executable(executable_path: str):
        with TemporaryDirectory() as tmpdir:
            spec_fname = os.path.join(tmpdir, 'spec.json')
            # run executable with SPEC_OUTPUT_FILE set to spec_fname
            env = os.environ.copy()
            env['SPEC_OUTPUT_FILE'] = spec_fname
            subprocess.run([executable_path], env=env)
            with open(spec_fname, 'r') as f:
                spec = json.load(f)
            a = App.from_spec(spec)
            setattr(a, '_executable_path', executable_path)
            return a
    def _run_job(self, *, job_id: str, job_private_key: str):
        job: Job = _get_job(job_id=job_id, job_private_key=job_private_key)
        processor_name = job.processor_name
        processor = next((p for p in self._processors if p._name == processor_name), None)
        if not hasattr(processor, '_processor_func'):
            raise Exception(f'Processor does not have a _processor_func attribute: {processor_name}')
        processor_func = processor._processor_func
        if processor_func is None:
            raise Exception(f'processor_func is None')

        kwargs = {}
        for input in processor._inputs:
            input_file = next((i for i in job.inputs if i._name == input.name), None)
            if input_file is None:
                raise Exception(f'Input not found: {input.name}')
            kwargs[input.name] = input_file
        for output in processor._outputs:
            output_file = next((o for o in job.outputs if o._name == output.name), None)
            if output_file is None:
                raise Exception(f'Output not found: {output.name}')
            kwargs[output.name] = output_file
        for parameter in processor._parameters:
            job_parameter = next((p for p in job.parameters if p.name == parameter.name), None)
            if job_parameter is None:
                kwargs[parameter.name] = parameter.default
            else:
                kwargs[parameter.name] = job_parameter.value
        
        processor_func(**kwargs)

        for output in processor._outputs:
            output_file = next((o for o in job.outputs if o._name == output.name), None)
            if output_file is None:
                raise Exception(f'Output not found: {output.name}')
            if not output_file._was_set:
                raise Exception(f'Output was not set: {output.name}')

class TemporaryDirectory:
    """A context manager for temporary directories"""
    def __init__(self):
        self._dir = None
    def __enter__(self):
        self._dir = tempfile.mkdtemp()
        return self._dir
    def __exit__(self, exc_type, exc_value, traceback):
        shutil.rmtree(self._dir)

def _get_job(*, job_id: str, job_private_key: str) -> str:
    """Get a job from the protocaas API"""
    req = {
        'type': 'processor.getJob',
        'jobId': job_id,
        'jobPrivateKey': job_private_key
    }
    res = _post_api_request(req)
    return Job(
        job_id=job_id,
        status=res['status'],
        processor_name=res['processorName'],
        inputs=[InputFile(name=i['name'], url=i['url']) for i in res['inputs']],
        outputs=[OutputFile(name=o['name'], job_id=job_id, job_private_key=job_private_key) for o in res['outputs']],
        parameters=[JobParameter(name=p['name'], value=p['value']) for p in res['parameters']]
    )