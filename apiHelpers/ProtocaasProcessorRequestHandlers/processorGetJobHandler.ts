import { isProtocaasFile, isProtocaasJob } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import removeIdField from "../removeIdField";
import { ProcessorGetJobRequest, ProcessorGetJobResponse } from "./ProtocaasProcessorRequest";

const processorGetJobHandler = async (request: ProcessorGetJobRequest): Promise<ProcessorGetJobResponse> => {
    const client = await getMongoClient()
    const jobsCollection = client.db('protocaas').collection('jobs')
    const filesCollection = client.db('protocaas').collection('files')

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

    const inputs: {
        name: string
        url: string
    }[] = []
    for (const input of job.inputFiles) {
        const file = removeIdField(await filesCollection.findOne({
            projectId: job.projectId,
            fileName: input.fileName
        }))
        if (!file) {
            throw Error(`Project file not found: ${input.fileName}`)
        }
        if (!isProtocaasFile(file)) {
            console.warn(file)
            throw new Error('Invalid project file in database (5)')
        }
        if (!file.content.startsWith('url:')) {
            throw new Error(`Project file ${input.fileName} is not a URL`)
        }
        const url = file.content.slice('url:'.length)
        inputs.push({
            name: input.name,
            url
        })
    }

    const outputs: {
        name: string
    }[] = []
    for (const output of job.outputFiles) {
        outputs.push({
            name: output.name
        })
    }

    const parameters: {
        name: string
        value: string
    }[] = []
    for (const parameter of job.inputParameters) {
        parameters.push({
            name: parameter.name,
            value: parameter.value
        })
    }
    
    return {
        type: 'processor.getJob',
        jobId: job.jobId,
        status: job.status,
        processorName: job.processorName,
        inputs,
        outputs,
        parameters
    }
}

export default processorGetJobHandler