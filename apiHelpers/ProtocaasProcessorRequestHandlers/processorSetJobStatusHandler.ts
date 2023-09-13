import { isProtocaasFile, isProtocaasJob } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import getPubnubClient from "../getPubnubClient";
import removeIdField from "../removeIdField";
import { ProcessorSetJobStatusRequest, ProcessorSetJobStatusResponse } from "./ProtocaasProcessorRequest";
import setFileHandler from "../ProtocaasRequestHandlers/setFileHandler";
import { SetFileRequest } from "../../src/types/ProtocaasRequest";

const processorSetJobStatusHandler = async (request: ProcessorSetJobStatusRequest): Promise<ProcessorSetJobStatusResponse> => {
    const client = await getMongoClient()
    const jobsCollection = client.db('protocaas').collection('jobs')

    const job = removeIdField(await jobsCollection.findOne({
        jobId: request.jobId
    }))
    if (!job) {
        throw new Error(`No job with ID ${request.jobId}`)
    }
    if (!isProtocaasJob(job)) {
        console.warn(job)
        throw new Error('Invalid job in database (2)')
    }

    if (job.jobPrivateKey !== request.jobPrivateKey) {
        throw new Error('Invalid job private key')
    }

    const oldStatus = job.status
    const newStatus = request.status

    if (newStatus === 'starting') {
        if (oldStatus !== 'pending') {
            return {
                type: 'processor.setJobStatus',
                success: false,
                error: `Cannot set job status to starting when status is ${oldStatus}`
            }
        }
    }
    else if (newStatus === 'running') {
        if (oldStatus !== 'starting') {
            return {
                type: 'processor.setJobStatus',
                success: false,
                error: `Cannot set job status to running when status is ${oldStatus}`
            }
        }
    }
    else if (newStatus === 'completed') {
        if (oldStatus !== 'running') {
            return {
                type: 'processor.setJobStatus',
                success: false,
                error: `Cannot set job status to completed when status is ${oldStatus}`
            }
        }
    }
    else if (newStatus === 'failed') {
        if ((oldStatus !== 'running') && (oldStatus !== 'starting') && (oldStatus !== 'pending')) {
            return {
                type: 'processor.setJobStatus',
                success: false,
                error: `Cannot set job status to failed when status is ${oldStatus}`
            }
        }
    }

    if (request.error) {
        if (newStatus !== 'failed') {
            return {
                type: 'processor.setJobStatus',
                success: false,
                error: `Cannot set job error when status is ${newStatus}`
            }
        }
    }

    if (newStatus === 'completed') {
        // we need to create the output files before marking the job as completed
        const outputBucketBaseUrl = process.env['OUTPUT_BUCKET_BASE_URL'] || ''
        if (!outputBucketBaseUrl) {
            throw new Error('Environment variable not set: OUTPUT_BUCKET_BASE_URL')
        }
        const outputFileIds: string[] = []
        for (const outputFile of job.outputFiles) {
            const outputFileUrl = `${outputBucketBaseUrl}/protocaas-outputs/${job.jobId}/${outputFile.name}`
            const outputFileId = await createOutputFile({
                fileName: outputFile.fileName,
                url: outputFileUrl,
                workspaceId: job.workspaceId,
                projectId: job.projectId,
                userId: job.userId,
                jobId: job.jobId
            })
            outputFileIds.push(outputFileId)
            outputFile.fileId = outputFileId // modify this in-place... the updated version will be set below
        }
        jobsCollection.updateOne({
            jobId: request.jobId
        }, {
            $set: {
                outputFiles: job.outputFiles, // was modified in-place above
                outputFileIds
            }
        })
    }

    const update: {[k: string]: any} = {}
    update['status'] = newStatus
    if (request.error) {
        update['error'] = request.error
    }
    if (newStatus === 'queued') {
        update['timestampQueued'] = Date.now() / 1000
    }
    else if (newStatus === 'starting') {
        update['timestampStarting'] = Date.now() / 1000
    }
    else if (newStatus === 'running') {
        update['timestampStarted'] = Date.now() / 1000
    }
    else if (newStatus === 'completed') {
        update['timestampFinished'] = Date.now() / 1000
    }
    else if (newStatus === 'failed') {
        update['timestampFinished'] = Date.now() / 1000
    }

    await jobsCollection.updateOne({
        jobId: request.jobId
    }, {
        $set: update
    })

    const pnClient = await getPubnubClient()
    if (pnClient) {
        await pnClient.publish({
            channel: job.computeResourceId,
            message: {
                type: 'jobStatusChanged',
                workspaceId: job.workspaceId,
                projectId: job.projectId,
                jobId: job.jobId,
                status: newStatus
            }
        })
    }

    return {
        type: 'processor.setJobStatus',
        success: true
    }
}

const createOutputFile = async (a: {
    fileName: string
    url: string
    workspaceId: string
    projectId: string
    userId: string
    jobId: string
}): Promise<string> => {
    const {fileName, url, workspaceId, projectId, userId, jobId} = a

    const size = await getSizeForRemoteFile(url)

    const req: SetFileRequest = {
        type: 'setFile',
        timestamp: Date.now() / 1000,
        projectId,
        workspaceId,
        fileName,
        content: `url:${url}`,
        size,
        jobId,
        metadata: {}
    }
    await setFileHandler(req, {verifiedUserId: userId})

    const client = await getMongoClient()
    const filesCollection = client.db('protocaas').collection('files')
    const file = removeIdField(await filesCollection.findOne({
        projectId: projectId,
        fileName: fileName
    }))
    if (!isProtocaasFile(file)) {
        console.warn(file)
        throw new Error('Invalid project file in database (x)')
    }
    return file.fileId
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

export default processorSetJobStatusHandler