# Overview of Protocaas

Protocaas is a browser-based application designed to simplify the creation, execution, and sharing of neuroscience analyses. It enables users to establish workspaces, create projects within those workspaces, and efficiently manage project files and processing jobs.

[GitHub repository](https://github.com/scratchrealm/protocaas)

## Workspace and Project Administration

Protocaas allows the creation of workspaces, with each workspace owned by a GitHub OAuth-authenticated user. Within these workspaces, users can create projects, and manage the associated files and tasks. Workspace owners and admin users can control access permissions, such as public visibility and read/write permissions for different users. Additionally, workspace admins can assign compute resources to the workspace to run Python scripts and analyses.

## Compute Resources

Every workspace comes equipped with a dedicated compute resource for executing Python scripts and analysis jobs. The default setting uses a compute resource with limitations, such as the global number of concurrent jobs. Alternatively, you can [host your own compute resource](https://github.com/scratchrealm/protocaas/blob/main/doc/host_compute_resource.md) on a local or remote machine and link this to your workspaces.