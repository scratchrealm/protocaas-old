import { ProtocaasWorkspace } from "../src/types/protocaas-types"
import getWorkspaceRole from './getWorkspaceRole'

export const userCanCreateProject = (workspace: ProtocaasWorkspace, userId: string | undefined): boolean => {
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return ((workspaceRole === 'admin' || workspaceRole === 'editor'))
}

export const userCanCreateWorkspace = (userId: string | undefined): boolean => {
    if (userId) {
        return true
    }
    return false
}

export const userCanDeleteProject = (workspace: ProtocaasWorkspace, userId: string | undefined): boolean => {
    if (!userId) return false
    const workspaceRole = getWorkspaceRole(workspace, userId)
    if (workspaceRole === 'admin' || workspaceRole === 'editor') {
        return true
    }
    return false
}

export const userCanDeleteWorkspace = (workspace: ProtocaasWorkspace, userId: string | undefined): boolean => {
    if (!userId) {
        return false
    }
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return workspaceRole === 'admin'
}

export const userCanReadWorkspace = (workspace: ProtocaasWorkspace, userId: string | undefined, clientId: string | undefined): boolean => {
    if (clientId) {
        const computeResourceId = workspace.computeResourceId || process.env.VITE_DEFAULT_COMPUTE_RESOURCE_ID
        if ((computeResourceId) && (computeResourceId === clientId)) {
            return true
        }
    }
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return ((workspaceRole === 'admin' || workspaceRole === 'editor' || workspaceRole === 'viewer'))
}

export const userCanSetFile = (workspace: ProtocaasWorkspace, userId: string | undefined, clientId: string | undefined): boolean => {
    if (clientId) {
        const computeResourceId = workspace.computeResourceId || process.env.VITE_DEFAULT_COMPUTE_RESOURCE_ID
        if ((computeResourceId) && (computeResourceId === clientId)) {
            return true
        }
    }
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return ((workspaceRole === 'admin' || workspaceRole === 'editor'))
}

export const userCanDeleteFile = (workspace: ProtocaasWorkspace, userId: string | undefined, clientId: string | undefined): boolean => {
    if (!userId) {
        // anonymous cannot delete
        return false
    }
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return ((workspaceRole === 'admin' || workspaceRole === 'editor'))
}

export const userCanSetWorkspaceProperty = (workspace: ProtocaasWorkspace, userId: string | undefined): boolean => {
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return (workspaceRole === 'admin')
}

export const userCanSetWorkspaceUsers = (workspace: ProtocaasWorkspace, userId: string | undefined): boolean => {
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return (workspaceRole === 'admin')
}

export const userCanSetProjectProperty = (workspace: ProtocaasWorkspace, userId: string | undefined, property: string): boolean => {
    const workspaceRole = getWorkspaceRole(workspace, userId)
    return ((workspaceRole === 'admin' || workspaceRole === 'editor'))
}