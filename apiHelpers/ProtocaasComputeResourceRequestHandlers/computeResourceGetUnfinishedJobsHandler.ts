import { isProtocaasComputeResource, isProtocaasJob, ProtocaasJob } from "../../src/types/protocaas-types"
import { getMongoClient } from "../getMongoClient"
import JSONStringifyDeterministic from "../jsonStringifyDeterministic"
import removeIdField from "../removeIdField"
import verifySignature from "../verifySignature"
import { ComputeResourceGetUnfinishedJobsRequest, ComputeResourceGetUnfinishedJobsResponse } from "./ProtocaasComputeResourceRequest"

const computeResourceGetUnfinishedJobsHandler = async (request: ComputeResourceGetUnfinishedJobsRequest): Promise<ComputeResourceGetUnfinishedJobsResponse> => {
    const client = await getMongoClient()

    const computeResourcesCollection = client.db('protocaas').collection('computeResources')
    const computeResource = removeIdField(await computeResourcesCollection.findOne({computeResourceId: request.computeResourceId}))
    if (!isProtocaasComputeResource(computeResource)) {
        console.warn(computeResource)
        throw new Error('Invalid compute resource in database (5)')
    }
    const okay = await verifySignature(JSONStringifyDeterministic({type: 'computeResource.getUnfinishedJobs'}), computeResource.computeResourceId, request.signature)
    if (!okay) {
        throw new Error('Invalid signature for computeResource.getUnfinishedJobs')
    }

    const jobsCollection = client.db('protocaas').collection('jobs')

    const filter: {[k: string]: any} = {}
    filter['computeResourceId'] = request.computeResourceId
    filter['status'] = {$in: ['pending', 'queued', 'starting', 'running']}

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
        type: 'computeResource.getUnfinishedJobs',
        jobs: jobsVerified.map(job => ({
            jobId: job.jobId,
            jobPrivateKey: job.jobPrivateKey,
            processorName: job.processorName,
        }))
    }
}

export default computeResourceGetUnfinishedJobsHandler