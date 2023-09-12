import click
from .compute_resource.init_compute_resource_node import init_compute_resource_node as init_compute_resource_node_function
from .compute_resource.start_compute_resource_node import start_compute_resource_node as start_compute_resource_node_function
from .compute_resource.run_job import run_job as run_job_function

@click.group(help="protocaas command line interface")
def main():
    pass

@click.command(help='Initialize a compute resource node in the current directory')
@click.option('--compute-resource-id', default=None, help='Compute resource ID')
@click.option('--compute-resource-private-key', default=None, help='Compute resource private key')
def init_compute_resource_node(compute_resource_id: str, compute_resource_private_key: str):
    init_compute_resource_node_function(dir='.', compute_resource_id=compute_resource_id, compute_resource_private_key=compute_resource_private_key)

@click.command(help="Start the compute resource node in the current directory")
def start_compute_resource_node():
    start_compute_resource_node_function(dir='.')

@click.command(help="Run a job (used internally by the compute resource)")
@click.option('--job-id', help='Job ID')
@click.option('--job-private-key', help='Job private key')
@click.option('--executable-path', help='Executable path for the app')
def run_job(job_id: str, job_private_key: str, executable_path: str):
    run_job_function(job_id=job_id, job_private_key=job_private_key, app_executable=executable_path)

main.add_command(init_compute_resource_node)
main.add_command(start_compute_resource_node)
main.add_command(run_job)