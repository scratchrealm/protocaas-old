import { isProtocaasJob } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import removeIdField from "../removeIdField";
import { ProcessorSetJobConsoleOutputRequest, ProcessorSetJobConsoleOutputResponse } from "./ProtocaasProcessorRequest";

const processorSetJobConsoleOutputHandler = async (request: ProcessorSetJobConsoleOutputRequest): Promise<ProcessorSetJobConsoleOutputResponse> => {
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

    const update: {[k: string]: any} = {}
    update['consoleOutput'] = request.consoleOutput

    await jobsCollection.updateOne({
        jobId: request.jobId
    }, {
        $set: update
    })

    return {
        type: 'processor.setJobConsoleOutput'
    }
}

export default processorSetJobConsoleOutputHandler