import { isProtocaasFile, isProtocaasJob, ProtocaasJob } from '../../src/types/protocaas-types'
import { getMongoClient } from '../getMongoClient'
import getProject from '../getProject'
import removeIdField from '../removeIdField'
import { ClientLoadProjectRequest, ClientLoadProjectResponse } from "./ProtocaasClientRequest"

const clientLoadProjectHandler = async (request: ClientLoadProjectRequest): Promise<ClientLoadProjectResponse> => {
    const project = await getProject(request.projectId, {useCache: false})

    const client = await getMongoClient()
    
    const filesCollection = client.db('protocaas').collection('files')
    const files = removeIdField(await filesCollection.find({
        projectId: request.projectId
    }).toArray())
    for (const file of files) {
        if (!isProtocaasFile(file)) {
            console.warn(file)

            throw new Error('Invalid project file in database (31)')
        }
    }

    const jobsCollection = client.db('protocaas').collection('jobs')
    const jobs = removeIdField(await jobsCollection.find({
        projectId: request.projectId
    }).toArray())
    for (const job of jobs) {
        if (!isProtocaasJob(job)) {
            console.warn(job)

            throw new Error('Invalid project job in database (31)')
        }
    }
    for (const job of jobs) {
        // hide the private keys
        (job as ProtocaasJob).jobPrivateKey = ''
    }

    return {
        type: 'client.loadProject',
        project,
        files,
        jobs
    }
}

export default clientLoadProjectHandler