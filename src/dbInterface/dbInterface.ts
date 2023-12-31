import { CreateProjectRequest, CreateJobRequest, CreateWorkspaceRequest, DeleteFileRequest, DeleteProjectRequest, DeleteComputeResourceRequest, DeleteJobRequest, DeleteWorkspaceRequest, GetProjectsRequest, GetFileRequest, GetFilesRequest, GetProjectRequest, GetComputeResourcesRequest, GetDataBlobRequest, GetJobRequest, GetJobsRequest, GetWorkspaceRequest, GetWorkspacesRequest, RegisterComputeResourceRequest, SetFileRequest, SetProjectPropertyRequest, SetWorkspacePropertyRequest, SetWorkspaceUsersRequest, DuplicateFileRequest, RenameFileRequest, GetComputeResourceRequest, SetComputeResourceAppsRequest } from "../types/ProtocaasRequest";
import { ProtocaasProject, ProtocaasFile, ProtocaasComputeResource, ProtocaasJob, ProtocaasWorkspace, ComputeResourceSpecProcessor, ComputeResourceAwsBatchOpts, ComputeResourceSlurmOpts } from "../types/protocaas-types";
import postProtocaasRequest from "./postProtocaasRequest";

export const fetchWorkspaces = async (auth: Auth): Promise<ProtocaasWorkspace[]> => {
    const req: GetWorkspacesRequest = {
        type: 'getWorkspaces',
        timestamp: Date.now() / 1000
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getWorkspaces') {
        throw Error(`Unexpected response type ${resp.type}. Expected getWorkspaces.`)
    }
    return resp.workspaces
}

export const fetchWorkspace = async (workspaceId: string, auth: Auth): Promise<ProtocaasWorkspace | undefined> => {
    const req: GetWorkspaceRequest = {
        type: 'getWorkspace',
        timestamp: Date.now() / 1000,
        workspaceId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getWorkspace') {
        throw Error(`Unexpected response type ${resp.type}. Expected getWorkspace.`)
    }
    return resp.workspace
}

type Auth = {
    githubAccessToken?: string
}

export const createWorkspace = async (workspaceName: string, auth: Auth): Promise<string> => {
    const req: CreateWorkspaceRequest = {
        type: 'createWorkspace',
        timestamp: Date.now() / 1000,
        name: workspaceName
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'createWorkspace') {
        throw Error(`Unexpected response type ${resp.type}. Expected createWorkspace.`)
    }
    return resp.workspaceId
}

export const fetchProjects = async (workspaceId: string, auth: Auth): Promise<ProtocaasProject[]> => {
    const req: GetProjectsRequest = {
        type: 'getProjects',
        timestamp: Date.now() / 1000,
        workspaceId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getProjects') {
        throw Error(`Unexpected response type ${resp.type}. Expected getProjects.`)
    }
    return resp.projects
}

export const createProject = async (workspaceId: string, projectName: string, auth: Auth): Promise<string> => {
    const req: CreateProjectRequest = {
        type: 'createProject',
        timestamp: Date.now() / 1000,
        workspaceId,
        name: projectName
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'createProject') {
        throw Error(`Unexpected response type ${resp.type}. Expected createProject.`)
    }
    return resp.projectId
}

export const setWorkspaceUsers = async (workspaceId: string, users: {userId: string, role: 'admin' | 'editor' | 'viewer'}[], auth: Auth): Promise<void> => {
    const req: SetWorkspaceUsersRequest = {
        type: 'setWorkspaceUsers',
        timestamp: Date.now() / 1000,
        workspaceId,
        users
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'setWorkspaceUsers') {
        throw Error(`Unexpected response type ${resp.type}. Expected setWorkspaceUsers.`)
    }
}

export const setWorkspaceProperty = async (workspaceId: string, property: 'name' | 'publiclyReadable' | 'listed' | 'computeResourceId', value: any, auth: Auth): Promise<void> => {
    const req: SetWorkspacePropertyRequest = {
        type: 'setWorkspaceProperty',
        timestamp: Date.now() / 1000,
        workspaceId,
        property,
        value
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'setWorkspaceProperty') {
        throw Error(`Unexpected response type ${resp.type}. Expected setWorkspaceProperty.`)
    }
}


export const deleteWorkspace = async (workspaceId: string, auth: Auth): Promise<void> => {
    const req: DeleteWorkspaceRequest = {
        type: 'deleteWorkspace',
        timestamp: Date.now() / 1000,
        workspaceId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'deleteWorkspace') {
        throw Error(`Unexpected response type ${resp.type}. Expected deleteWorkspace.`)
    }
}

export const fetchProject = async (projectId: string, auth: Auth): Promise<ProtocaasProject | undefined> => {
    const req: GetProjectRequest = {
        type: 'getProject',
        timestamp: Date.now() / 1000,
        projectId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getProject') {
        throw Error(`Unexpected response type ${resp.type}. Expected getProject.`)
    }
    return resp.project
}

export const fetchFiles = async (projectId: string, auth: Auth): Promise<ProtocaasFile[]> => {
    const req: GetFilesRequest = {
        type: 'getFiles',
        timestamp: Date.now() / 1000,
        projectId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getFiles') {
        throw Error(`Unexpected response type ${resp.type}. Expected getFiles.`)
    }
    return resp.files
}

export const fetchFile = async (projectId: string, fileName: string, auth: Auth): Promise<ProtocaasFile | undefined> => {
    const req: GetFileRequest = {
        type: 'getFile',
        timestamp: Date.now() / 1000,
        projectId,
        fileName
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getFile') {
        throw Error(`Unexpected response type ${resp.type}. Expected getFile.`)
    }
    return resp.file
}

export const fetchFileText = async (file: ProtocaasFile, auth: Auth): Promise<string | undefined> => {
    if (file.content.startsWith('blob:')) {
        const sha1 = file.content.slice('blob:'.length)
        const txt = await fetchDataBlob(file.workspaceId, file.projectId, sha1, {})
        return txt
    }
    else if (file.content.startsWith('data:')) {
        const txt = file.content.slice('data:'.length)
        return txt
    }
    else {
        throw Error(`Unable to fetch file text for file ${file.fileName}`)
    }
}


export const fetchDataBlob = async (workspaceId: string, projectId: string, sha1: string, auth: Auth): Promise<string | undefined> => {
    const req: GetDataBlobRequest = {
        type: 'getDataBlob',
        timestamp: Date.now() / 1000,
        workspaceId,
        projectId,
        sha1
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getDataBlob') {
        throw Error(`Unexpected response type ${resp.type}. Expected getDataBlob.`)
    }
    return resp.content
}

export const setFileText = async (workspaceId: string, projectId: string, fileName: string, fileContent: string, auth: Auth): Promise<void> => {
    const req: SetFileRequest = {
        type: 'setFile',
        timestamp: Date.now() / 1000,
        projectId,
        workspaceId,
        fileName,
        fileData: fileContent,
        size: fileContent.length,
        metadata: {}
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'setFile') {
        throw Error(`Unexpected response type ${resp.type}. Expected setFile.`)
    }
}

export const headRequest = async (url: string) => {
    // Cannot use HEAD, because it is not allowed by CORS on DANDI AWS bucket
    // let headResponse
    // try {
    //     headResponse = await fetch(url, {method: 'HEAD'})
    //     if (headResponse.status !== 200) {
    //         return undefined
    //     }
    // }
    // catch(err: any) {
    //     console.warn(`Unable to HEAD ${url}: ${err.message}`)
    //     return undefined
    // }
    // return headResponse

    // Instead, use aborted GET.
    const controller = new AbortController();
    const signal = controller.signal;
    const response = await fetch(url, { signal })
    controller.abort();
    return response
}

const getSizeForRemoteFile = async (url: string): Promise<number> => {
    const response = await headRequest(url)
    if (!response) {
        throw Error(`Unable to HEAD ${url}`)
    }
    const size = Number(response.headers.get('content-length'))
    if (isNaN(size)) {
        throw Error(`Unable to get content-length for ${url}`)
    }
    return size
}

export const setUrlFile = async (workspaceId: string, projectId: string, fileName: string, url: string, metadata: any, auth: Auth): Promise<void> => {
    const size = await getSizeForRemoteFile(url)
    const req: SetFileRequest = {
        type: 'setFile',
        timestamp: Date.now() / 1000,
        projectId,
        workspaceId,
        fileName,
        content: `url:${url}`,
        size,
        metadata
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'setFile') {
        throw Error(`Unexpected response type ${resp.type}. Expected setFile.`)
    }
}

export const deleteFile = async (workspaceId: string, projectId: string, fileName: string, auth: Auth): Promise<void> => {
    const req: DeleteFileRequest = {
        type: 'deleteFile',
        timestamp: Date.now() / 1000,
        projectId,
        workspaceId,
        fileName
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'deleteFile') {
        throw Error(`Unexpected response type ${resp.type}. Expected deleteFile.`)
    }
}

export const duplicateFile = async (workspaceId: string, projectId: string, fileName: string, newFileName: string, auth: Auth): Promise<void> => {
    const req: DuplicateFileRequest = {
        type: 'duplicateFile',
        timestamp: Date.now() / 1000,
        projectId,
        workspaceId,
        fileName,
        newFileName
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'duplicateFile') {
        throw Error(`Unexpected response type ${resp.type}. Expected duplicateFile.`)
    }
}

export const renameFile = async (workspaceId: string, projectId: string, fileName: string, newFileName: string, auth: Auth): Promise<void> => {
    const req: RenameFileRequest = {
        type: 'renameFile',
        timestamp: Date.now() / 1000,
        projectId,
        workspaceId,
        fileName,
        newFileName
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'renameFile') {
        throw Error(`Unexpected response type ${resp.type}. Expected renameFile.`)
    }
}

export const deleteProject = async (workspaceId: string, projectId: string, auth: Auth): Promise<void> => {
    const req: DeleteProjectRequest = {
        type: 'deleteProject',
        timestamp: Date.now() / 1000,
        workspaceId,
        projectId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'deleteProject') {
        throw Error(`Unexpected response type ${resp.type}. Expected deleteProject.`)
    }
}

export const setProjectProperty = async (projectId: string, property: 'name', value: any, auth: Auth): Promise<void> => {
    const req: SetProjectPropertyRequest = {
        type: 'setProjectProperty',
        timestamp: Date.now() / 1000,
        projectId,
        property,
        value
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'setProjectProperty') {
        throw Error(`Unexpected response type ${resp.type}. Expected setProjectProperty.`)
    }
}

export const fetchComputeResources = async (auth: Auth): Promise<ProtocaasComputeResource[]> => {
    const req: GetComputeResourcesRequest = {
        type: 'getComputeResources',
        timestamp: Date.now() / 1000
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getComputeResources') {
        throw Error(`Unexpected response type ${resp.type}. Expected getComputeResources.`)
    }
    return resp.computeResources
}

export const fetchComputeResource = async (computeResourceId: string, auth: Auth): Promise<ProtocaasComputeResource | undefined> => {
    const req: GetComputeResourceRequest = {
        type: 'getComputeResource',
        timestamp: Date.now() / 1000,
        computeResourceId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getComputeResource') {
        throw Error(`Unexpected response type ${resp.type}. Expected getComputeResource.`)
    }
    return resp.computeResource
}

export const registerComputeResource = async (computeResourceId: string, resourceCode: string, name: string, auth: Auth): Promise<void> => {
    const req: RegisterComputeResourceRequest = {
        type: 'registerComputeResource',
        timestamp: Date.now() / 1000,
        computeResourceId,
        resourceCode,
        name
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'registerComputeResource') {
        throw Error(`Unexpected response type ${resp.type}. Expected registerComputeResource.`)
    }
}

export const deleteComputeResource = async (computeResourceId: string, auth: Auth): Promise<void> => {
    const req: DeleteComputeResourceRequest = {
        type: 'deleteComputeResource',
        timestamp: Date.now() / 1000,
        computeResourceId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'deleteComputeResource') {
        throw Error(`Unexpected response type ${resp.type}. Expected deleteComputeResource.`)
    }
}

export type App = {
    name: string
    executablePath: string
    container?: string
    awsBatch?: ComputeResourceAwsBatchOpts
    slurm?: ComputeResourceSlurmOpts
}

export const setComputeResourceApps = async (computeResourceId: string, apps: App[], auth: Auth): Promise<void> => {
    const req: SetComputeResourceAppsRequest = {
        type: 'setComputeResourceApps',
        timestamp: Date.now() / 1000,
        computeResourceId,
        apps
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'setComputeResourceApps') {
        throw Error(`Unexpected response type ${resp.type}. Expected setComputeResourceApps.`)
    }
}

export type ProtocaasProcessingJobDefinition = {
    processorName: string,
    inputFiles: {
        name: string
        fileName: string
    }[],
    inputParameters: {
        name: string
        value: any
    }[],
    outputFiles: {
        name: string
        fileName: string
    }[]
}

export type ProtocaasProcessingJobDefinitionAction = {
    type: 'setInputFile'
    name: string
    fileName: string
} | {
    type: 'setInputParameter'
    name: string
    value: any
} | {
    type: 'setOutputFile'
    name: string
    fileName: string
} | {
    type: 'setProcessorName'
    processorName: string
} | {
    type: 'setJobDefinition'
    jobDefinition: ProtocaasProcessingJobDefinition
}

export const defaultJobDefinition: ProtocaasProcessingJobDefinition = {
    processorName: '',
    inputFiles: [],
    inputParameters: [],
    outputFiles: []
}

export const protocaasJobDefinitionReducer = (state: ProtocaasProcessingJobDefinition, action: ProtocaasProcessingJobDefinitionAction): ProtocaasProcessingJobDefinition => {

    switch (action.type) {
        case 'setInputFile':
            // check if no change
            if (state.inputFiles.find(f => f.name === action.name && f.fileName === action.fileName)) {
                return state
            }
            return {
                ...state,
                inputFiles: state.inputFiles.map(f => f.name === action.name ? {...f, fileName: action.fileName} : f)
            }
        case 'setInputParameter':
            // check if no change
            if (state.inputParameters.find(p => p.name === action.name && deepEqual(p.value, action.value))) {
                return state
            }
            return {
                ...state,
                inputParameters: state.inputParameters.map(p => p.name === action.name ? {...p, value: action.value} : p)
            }
        case 'setOutputFile':
            // check if no change
            if (state.outputFiles.find(f => f.name === action.name && f.fileName === action.fileName)) {
                return state
            }
            return {
                ...state,
                outputFiles: state.outputFiles.map(f => f.name === action.name ? {...f, fileName: action.fileName} : f)
            }
        case 'setProcessorName':
            // check if no change
            if (state.processorName === action.processorName) {
                return state
            }
            return {
                ...state,
                processorName: action.processorName
            }
        case 'setJobDefinition':
            return action.jobDefinition
        default:
            throw Error(`Unexpected action type ${(action as any).type}`)
    }
}

export const createJob = async (
    a: {
        workspaceId: string,
        projectId: string,
        jobDefinition: ProtocaasProcessingJobDefinition,
        processorSpec: ComputeResourceSpecProcessor,
        batchId?: string
    },
    auth: Auth
) : Promise<string> => {
    const {workspaceId, projectId, jobDefinition, processorSpec, batchId} = a
    const req: CreateJobRequest = {
        type: 'createJob',
        timestamp: Date.now() / 1000,
        workspaceId,
        projectId,
        batchId,
        processorName: jobDefinition.processorName,
        inputFiles: jobDefinition.inputFiles,
        inputParameters: jobDefinition.inputParameters,
        outputFiles: jobDefinition.outputFiles,
        processorSpec
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'createJob') {
        throw Error(`Unexpected response type ${resp.type}. Expected createJob.`)
    }
    return resp.jobId
}

export const deleteJob = async (workspaceId: string, projectId: string, jobId: string, auth: Auth): Promise<void> => {
    const req: DeleteJobRequest = {
        type: 'deleteJob',
        timestamp: Date.now() / 1000,
        workspaceId,
        projectId,
        jobId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'deleteJob') {
        throw Error(`Unexpected response type ${resp.type}. Expected deleteJob.`)
    }
}

export const fetchJobsForProject = async (projectId: string, auth: Auth): Promise<ProtocaasJob[]> => {
    const req: GetJobsRequest = {
        type: 'getJobs',
        timestamp: Date.now() / 1000,
        projectId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getJobs') {
        throw Error(`Unexpected response type ${resp.type}. Expected getJobs.`)
    }
    return resp.jobs
}

export const fetchJobsForComputeResource = async (computeResourceId: string, auth: Auth): Promise<ProtocaasJob[]> => {
    const req: GetJobsRequest = {
        type: 'getJobs',
        timestamp: Date.now() / 1000,
        computeResourceId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getJobs') {
        throw Error(`Unexpected response type ${resp.type}. Expected getJobs.`)
    }
    return resp.jobs
}

export const fetchJob = async (jobId: string, auth: Auth): Promise<ProtocaasJob | undefined> => {
    const req: GetJobRequest = {
        type: 'getJob',
        timestamp: Date.now() / 1000,
        jobId
    }
    const resp = await postProtocaasRequest(req, {...auth})
    if (resp.type !== 'getJob') {
        throw Error(`Unexpected response type ${resp.type}. Expected getJob.`)
    }
    return resp.job
}

export const getComputeResource = async (computeResourceId: string): Promise<any> => {
    const req: GetComputeResourceRequest = {
        type: 'getComputeResource',
        timestamp: Date.now() / 1000,
        computeResourceId
    }
    const resp = await postProtocaasRequest(req, {})
    if (resp.type !== 'getComputeResource') {
        throw Error(`Unexpected response type ${resp.type}. Expected getComputeResource.`)
    }
    return resp.computeResource
}

const deepEqual = (a: any, b: any): boolean => {
    if (typeof a !== typeof b) {
        return false
    }
    if (typeof a === 'object') {
        if (Array.isArray(a)) {
            if (!Array.isArray(b)) {
                return false
            }
            if (a.length !== b.length) {
                return false
            }
            for (let i = 0; i < a.length; i++) {
                if (!deepEqual(a[i], b[i])) {
                    return false
                }
            }
            return true
        }
        else {
            const aKeys = Object.keys(a)
            const bKeys = Object.keys(b)
            if (aKeys.length !== bKeys.length) {
                return false
            }
            for (const key of aKeys) {
                if (!deepEqual(a[key], b[key])) {
                    return false
                }
            }
            return true
        }
    }
    else {
        return a === b
    }
}