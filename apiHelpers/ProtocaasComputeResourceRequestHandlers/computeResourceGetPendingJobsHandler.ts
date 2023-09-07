import { isProtocaasComputeResource, isProtocaasJob, ProtocaasJob } from "../../src/types/protocaas-types"
import { getMongoClient } from "../getMongoClient"
import removeIdField from "../removeIdField"
import verifySignature from "../verifySignature"
import { ComputeResourceGetPendingJobsRequest, ComputeResourceGetPendingJobsResponse } from "./ProtocaasComputeResourceRequest"

const computeResourceGetPendingJobsHandler = async (request: ComputeResourceGetPendingJobsRequest): Promise<ComputeResourceGetPendingJobsResponse> => {
    const client = await getMongoClient()

    const computeResourcesCollection = client.db('protocaas').collection('computeResources')
    const computeResource = removeIdField(await computeResourcesCollection.findOne({computeResourceId: request.computeResourceId}))
    if (!isProtocaasComputeResource(computeResource)) {
        console.warn(computeResource)
        throw new Error('Invalid compute resource in database (5)')
    }
    const okay = await verifySignature({type: 'computeResource.getPendingJobs'}, computeResource.computeResourceId, request.signature)
    if (!okay) {
        throw new Error('Invalid signature')
    }

    const jobsCollection = client.db('protocaas').collection('jobs')

    const filter: {[k: string]: any} = {}
    filter['computeResourceId'] = request.computeResourceId
    filter['status'] = 'pending'

    const jobs = removeIdField(await jobsCollection.find(filter).toArray())
    for (const job of jobs) {
        if (!isProtocaasJob(job)) {
            console.warn(JSON.stringify(job, null, 2))
            console.warn('Invalid job in database (5)')

            // // one-off correction, delete invalid job
            // await jobsCollection.deleteOne({
            //     jobId: job.jobId
            // })

            throw new Error('Invalid job in database (5)')
        }
    }
    const jobsVerified: ProtocaasJob[] = jobs

    const computeResourceNodesCollection = client.db('protocaas').collection('computeResourceNodes')
    await computeResourceNodesCollection.updateOne({
        computeResourceId: request.computeResourceId,
        nodeId: request.nodeId,
    }, {
        $set: {
            timestampLastActive: Date.now() / 1000,
            computeResourceId: request.computeResourceId,
            nodeId: request.nodeId,
            nodeName: request.nodeName
        }
    }, {
        upsert: true
    })

    return {
        type: 'computeResource.getPendingJobs',
        jobs: jobsVerified.map(job => ({
            jobId: job.jobId,
            jobPrivateKey: job.jobPrivateKey,
            processorName: job.processorName,
        }))
    }
}

export default computeResourceGetPendingJobsHandler