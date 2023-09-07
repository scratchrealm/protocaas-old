import { isProtocaasJob } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import removeIdField from "../removeIdField";
import { ProcessorGetOutputUploadUrlRequest, ProcessorGetOutputUploadUrlResponse } from "./ProtocaasProcessorRequest";
import { getSignedUploadUrl, Bucket } from './s3Helpers'

const processorGetOutputUploadUrlHandler = async (request: ProcessorGetOutputUploadUrlRequest): Promise<ProcessorGetOutputUploadUrlResponse> => {
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

    const aa = job.outputFiles.find(x => (x.name === request.outputName))
    if (!aa) {
        throw Error(`Output not found: ${request.outputName}`)
    }

    const objectKey = `protocaas-outputs/${job.jobId}/${request.outputName}`

    const bucket: Bucket = {
        uri: process.env['OUTPUT_BUCKET_URI'] || '',
        credentials: process.env['OUTPUT_BUCKET_CREDENTIALS'] || ''
    }
    if (!bucket.uri) {
        throw new Error('Environment variable not set: OUTPUT_BUCKET_URI')
    }
    if (!bucket.credentials) {
        throw new Error('Environment variable not set: OUTPUT_BUCKET_CREDENTIALS')
    }

    const signedUploadUrl = await getSignedUploadUrl(bucket, objectKey)
    
    return {
        type: 'processor.getOutputUploadUrl',
        uploadUrl: signedUploadUrl
    }
}

export default processorGetOutputUploadUrlHandler