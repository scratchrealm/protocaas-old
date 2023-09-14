import { isProtocaasFile, ProtocaasJob } from "../../src/types/protocaas-types";
import { CreateJobRequest, CreateJobResponse } from "../../src/types/ProtocaasRequest";
import createRandomId from "../createRandomId";
import { getMongoClient } from "../getMongoClient";
import getProject from "../getProject";
import getPubnubClient from "../getPubnubClient";
import getWorkspace from "../getWorkspace";
import getWorkspaceRole from "../getWorkspaceRole";
import removeIdField from "../removeIdField";

const createJobHandler = async (request: CreateJobRequest, o: {verifiedClientId?: string, verifiedUserId?: string}): Promise<CreateJobResponse> => {
    const userId = o.verifiedUserId
    const workspaceId = request.workspaceId

    const workspace = await getWorkspace(workspaceId, {useCache: false})
    const workspaceRole = getWorkspaceRole(workspace, userId)

    const client = await getMongoClient()

    if (!userId) {
        throw new Error('User must be logged in to create jobs')
    }

    const canEdit = workspaceRole === 'admin' || workspaceRole === 'editor'
    if (!canEdit) {
        throw new Error('User does not have permission to create jobs')
    }

    let computeResourceId = workspace.computeResourceId
    if (!computeResourceId) {
        computeResourceId = process.env.VITE_DEFAULT_COMPUTE_RESOURCE_ID
        if (!computeResourceId) {
            throw new Error('Workspace does not have a compute resource ID, and no default VITE_DEFAULT_COMPUTE_RESOURCE_ID is set in the environment.')
        }
    }

    const project = await getProject(request.projectId, {useCache: false})
    // important to check this
    if (project.workspaceId !== workspaceId) {
        throw new Error('Incorrect workspace ID')
    }

    const filesCollection = client.db('protocaas').collection('files')

    const inputFiles: {
        name: string,
        fileId: string,
        fileName: string
    }[] = []
    for (const inputFile of request.inputFiles) {
        const file = removeIdField(await filesCollection.findOne({
            projectId: request.projectId,
            fileName: inputFile.fileName
        }))
        if (!file) {
            throw new Error('Project input file does not exist: ' + inputFile.fileName)
        }
        if (!isProtocaasFile(file)) {
            console.warn(file)
            throw new Error('Invalid project file in database (x)')
        }
        inputFiles.push({
            name: inputFile.name,
            fileId: file.fileId,
            fileName: file.fileName
        })
    }

    const jobId = createRandomId(8)
    const jobPrivateKey = createRandomId(32)

    const filterOutputFileName = (fileName: string) => {
        // replace ${job-id} with the actual job ID
        return fileName.replace(/\$\{job-id\}/g, jobId)
    }

    const outputFiles = request.outputFiles.map(x => ({
        ...x,
        fileName: filterOutputFileName(x.fileName),
    }))

    const job: ProtocaasJob = {
        jobId,
        jobPrivateKey,
        workspaceId,
        projectId: request.projectId,
        userId,
        processorName: request.processorName,
        inputFiles,
        inputFileIds: inputFiles.map(x => x.fileId),
        inputParameters: request.inputParameters,
        outputFiles,
        timestampCreated: Date.now() / 1000,
        computeResourceId,
        status: 'pending',
        processorSpec: request.processorSpec
    }
    if (request.batchId) {
        job.batchId = request.batchId
    }
    const jobsCollection = client.db('protocaas').collection('jobs')
    await jobsCollection.insertOne(job)

    const pnClient = await getPubnubClient()
    if (pnClient) {
        await pnClient.publish({
            channel: computeResourceId,
            message: {
                type: 'newPendingJob',
                workspaceId,
                projectId: request.projectId,
                jobId
            }
        })
    }

    return {
        type: 'createJob',
        jobId
    }
}

export default createJobHandler