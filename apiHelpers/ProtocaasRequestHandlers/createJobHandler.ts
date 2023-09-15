import { isProtocaasFile, isProtocaasJob, ProtocaasJob } from "../../src/types/protocaas-types";
import { CreateJobRequest, CreateJobResponse, DeleteFileRequest, DeleteJobRequest } from "../../src/types/ProtocaasRequest";
import createRandomId from "../createRandomId";
import { getMongoClient } from "../getMongoClient";
import getProject from "../getProject";
import getPubnubClient from "../getPubnubClient";
import getWorkspace from "../getWorkspace";
import getWorkspaceRole from "../getWorkspaceRole";
import removeIdField from "../removeIdField";
import deleteFileHandler  from "./deleteFileHandler";
import deleteJobHandler from "./deleteJobHandler";

const createJobHandler = async (request: CreateJobRequest, o: {verifiedClientId?: string, verifiedUserId?: string}): Promise<CreateJobResponse> => {
    const userId = o.verifiedUserId
    const workspaceId = request.workspaceId

    const workspace = await getWorkspace(workspaceId, {useCache: false})
    const workspaceRole = getWorkspaceRole(workspace, userId)

    const client = await getMongoClient()

    const jobsCollection = client.db('protocaas').collection('jobs')

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

    // delete any existing output files
    for (const outputFile of outputFiles) {
        const existingFile = await filesCollection.findOne({
            projectId: request.projectId,
            fileName: outputFile.fileName
        })
        if (existingFile) {
            // important to do it this way rather than deleting directly from the database
            // because this will also delete any jobs that involve this file
            const req: DeleteFileRequest = {
                type: 'deleteFile',
                timestamp: Date.now() / 1000,
                workspaceId,
                projectId: request.projectId,
                fileName: outputFile.fileName
            }
            await deleteFileHandler(req, o)
        }
    }

    // delete any jobs that are expected to produce the output files
    // because maybe the output files haven't been created yet, but we still want to delete/cancel them
    const allJobs = removeIdField(await jobsCollection.find({
        projectId: request.projectId
    }).toArray())
    const outputFileNames = outputFiles.map(x => x.fileName)
    for (const jj of allJobs) {
        if (!isProtocaasJob(jj)) {
            console.warn(jj)
            throw new Error('Invalid job in database (98)')
        }
        let shouldDelete = false
        for (const outputFile of jj.outputFiles) {
            if (outputFileNames.includes(outputFile.fileName)) {
                shouldDelete = true
            }
        }
        if (shouldDelete) {
            // Do it this way rather than deleting directly from the database
            // because this will also delete any files that are produced by this job
            const req: DeleteJobRequest = {
                type: 'deleteJob',
                timestamp: Date.now() / 1000,
                workspaceId,
                projectId: request.projectId,
                jobId: jj.jobId
            }
            await deleteJobHandler(req, o)
        }
    }

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
    await jobsCollection.insertOne(job)

    const pnClient = await getPubnubClient()
    if (pnClient) {
        await pnClient.publish({
            channel: computeResourceId,
            message: {
                type: 'newPendingJob',
                workspaceId,
                projectId: request.projectId,
                computeResourceId,
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