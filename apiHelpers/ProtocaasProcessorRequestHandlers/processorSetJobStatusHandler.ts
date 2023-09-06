import { isProtocaasJob } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import getPubnubClient from "../getPubnubClient";
import removeIdField from "../removeIdField";
import { ProcessorSetJobStatusRequest, ProcessorSetJobStatusResponse } from "./ProtocaasProcessorRequest";

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

    const update: {[k: string]: any} = {}
    update['status'] = newStatus
    if (request.error) {
        update['error'] = request.error
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

export default processorSetJobStatusHandler