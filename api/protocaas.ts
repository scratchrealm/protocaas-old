import { VercelRequest, VercelResponse } from '@vercel/node'
import githubVerifyAccessToken from '../apiHelpers/githubVerifyAccessToken'
import JSONStringifyDeterminsitic from '../apiHelpers/jsonStringifyDeterministic'
import createProjectHandler from '../apiHelpers/ProtocaasRequestHandlers/createProjectHandler'
import createJobHandler from '../apiHelpers/ProtocaasRequestHandlers/createJobHandler'
import createWorkspaceHandler from '../apiHelpers/ProtocaasRequestHandlers/createWorkspaceHandler'
import deleteComputeResourceHandler from '../apiHelpers/ProtocaasRequestHandlers/deleteComputeResourceHandler'
import deleteFileHandler from '../apiHelpers/ProtocaasRequestHandlers/deleteFileHandler'
import deleteProjectHandler from '../apiHelpers/ProtocaasRequestHandlers/deleteProjectHandler'
import deleteJobHandler from '../apiHelpers/ProtocaasRequestHandlers/deleteJobHandler'
import deleteWorkspaceHandler from '../apiHelpers/ProtocaasRequestHandlers/deleteWorkspaceHandler'
import duplicateFileHandler from '../apiHelpers/ProtocaasRequestHandlers/duplicateFileHandler'
import getComputeResourcesHandler from '../apiHelpers/ProtocaasRequestHandlers/getComputeResourcesHandler'
import getComputeResourceHandler from '../apiHelpers/ProtocaasRequestHandlers/getComputeResourceHandler'
import getDataBlobHandler from '../apiHelpers/ProtocaasRequestHandlers/getDataBlobHandler'
import getActiveComputeResourceNodesHandler from '../apiHelpers/ProtocaasRequestHandlers/getActiveComputeResourceNodesHandler'
import getFileHandler from '../apiHelpers/ProtocaasRequestHandlers/getFileHandler'
import getFilesHandler from '../apiHelpers/ProtocaasRequestHandlers/getFilesHandler'
import getProjectHandler from '../apiHelpers/ProtocaasRequestHandlers/getProjectHandler'
import getProjectsHandler from '../apiHelpers/ProtocaasRequestHandlers/getProjectsHandler'
import getJobHandler from '../apiHelpers/ProtocaasRequestHandlers/getJobHandler'
import getJobsHandler from '../apiHelpers/ProtocaasRequestHandlers/getJobsHandler'
import getWorkspaceHandler from '../apiHelpers/ProtocaasRequestHandlers/getWorkspaceHandler'
import getWorkspacesHandler from '../apiHelpers/ProtocaasRequestHandlers/getWorkspacesHandler'
import registerComputeResourceHandler from '../apiHelpers/ProtocaasRequestHandlers/registerComputeResourceHandler'
import renameFileHandler from '../apiHelpers/ProtocaasRequestHandlers/renameFileHandler'
import setFileHandler from '../apiHelpers/ProtocaasRequestHandlers/setFileHandler'
import setProjectPropertyHandler from '../apiHelpers/ProtocaasRequestHandlers/setProjectPropertyHandler'
import setJobPropertyHandler from '../apiHelpers/ProtocaasRequestHandlers/setJobPropertyHandler'
import setWorkspacePropertyHandler from '../apiHelpers/ProtocaasRequestHandlers/setWorkspacePropertyHandler'
import setWorkspaceUsersHandler from '../apiHelpers/ProtocaasRequestHandlers/setWorkspaceUsersHandler'
import getPubsubSubscriptionHandler from '../apiHelpers/ProtocaasRequestHandlers/getPubsubSubscriptionHandler'
import setComputeResourceSpecHandler from '../apiHelpers/ProtocaasRequestHandlers/setComputeResourceSpecHandler'
import getComputeResourceSpecHandler from '../apiHelpers/ProtocaasRequestHandlers/getComputeResourceSpecHandler'
import verifySignature from '../apiHelpers/verifySignature'
import { isCreateProjectRequest, isCreateJobRequest, isCreateWorkspaceRequest, isDeleteComputeResourceRequest, isDeleteFileRequest, isDeleteProjectRequest, isDeleteJobRequest, isDeleteWorkspaceRequest, isDuplicateFileRequest, isGetActiveComputeResourceNodesRequest, isGetComputeResourceRequest, isGetComputeResourcesRequest, isGetDataBlobRequest, isGetJobsRequest, isGetFileRequest, isGetFilesRequest, isGetProjectRequest, isGetProjectsRequest, isGetPubsubSubscriptionRequest, isGetJobRequest, isGetWorkspaceRequest, isGetWorkspacesRequest, isProtocaasRequest, isRegisterComputeResourceRequest, isRenameFileRequest, isSetFileRequest, isSetProjectPropertyRequest, isSetJobPropertyRequest, isSetWorkspacePropertyRequest, isSetWorkspaceUsersRequest, isSetComputeResourceSpecRequest, isGetComputeResourceSpecRequest } from '../src/types/ProtocaasRequest'
import {ProtocaasProcessorRequest, isProtocaasProcessorRequest, ProtocaasProcessorResponse, isProcessorGetJobRequest, isProcessorSetJobStatusRequest, isProcessorSetJobConsoleOutputRequest} from '../apiHelpers/ProtocaasProcessorRequestHandlers/ProtocaasProcessorRequest'
import processorGetJobHandler from '../apiHelpers/ProtocaasProcessorRequestHandlers/processorGetJobHandler'
import processorSetJobStatusHandler from '../apiHelpers/ProtocaasProcessorRequestHandlers/processorSetJobStatusHandler'
import processorSetJobConsoleOutputHandler from '../apiHelpers/ProtocaasProcessorRequestHandlers/processorSetJobConsoleOutputHandler'

const ADMIN_USER_IDS = JSON.parse(process.env.ADMIN_USER_IDS || '[]') as string[]

module.exports = (req: VercelRequest, res: VercelResponse) => {
    const {body: request} = req

    // CORS ///////////////////////////////////
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    if ([
        'http://localhost:3000',
        'http://localhost:5173',
        'https://flatironinstitute.github.io',
        'https://scratchrealm.github.io'
    ].includes(req.headers.origin || '')) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }
    ///////////////////////////////////////////

    (async () => {
        if (isProtocaasProcessorRequest(request)) {
            return await handleProcessorRequest(request)
        }

        if (!isProtocaasRequest(request)) {
            res.status(400).send(`Invalid request: ${JSON.stringify(request)}`)
            return
        }

        const { payload, fromClientId, signature, userId, githubAccessToken } = request
        const { timestamp } = payload
        const elapsed = (Date.now() / 1000) - timestamp
        if ((elapsed > 30) || (elapsed < -30)) { 
            // Note the range used to be narrower, but was running into problems
            // For example, got elapsed = -0.662
            // Not sure the best way to do this check
            throw Error(`Invalid timestamp. ${timestamp} ${Date.now() / 1000} ${elapsed}`)
        }
        let verifiedClientId: string | undefined = undefined
        if (fromClientId) {
            if (!signature) throw Error('No signature provided with fromClientId')
            if (!(await verifySignature(JSONStringifyDeterminsitic(payload), fromClientId, signature))) {
                throw Error('Invalid signature')
            }
            verifiedClientId = fromClientId
        }

        let verifiedUserId: string | undefined = undefined
        if ((userId) && (userId.startsWith('github|')) && (githubAccessToken)) {
            if (!(await githubVerifyAccessToken(userId.slice('github|'.length), githubAccessToken))) {
                throw Error('Unable to verify github user ID')
            }
            verifiedUserId = userId
        }
        else if ((userId) && (userId.startsWith('admin|'))) {
            const x = userId.slice('admin|'.length)
            if (!ADMIN_USER_IDS.includes(x)) {
                throw Error('Invalid admin user ID')
            }
            if (!x.startsWith('github|')) {
                throw Error('Invalid admin user ID (does not start with github|)')
            }
            if (!(await githubVerifyAccessToken(x.slice('github|'.length), githubAccessToken))) {
                throw Error('Unable to verify github user ID (for admin)')
            }
            verifiedUserId = userId
        }
        
        if (isGetWorkspacesRequest(payload)) {
            return await getWorkspacesHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetWorkspaceRequest(payload)) {
            return await getWorkspaceHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isCreateWorkspaceRequest(payload)) {
            return await createWorkspaceHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetProjectsRequest(payload)) {
            return await getProjectsHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetProjectRequest(payload)) {
            return await getProjectHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isCreateProjectRequest(payload)) {
            return await createProjectHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isDeleteWorkspaceRequest(payload)) {
            return await deleteWorkspaceHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetFilesRequest(payload)) {
            return await getFilesHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isSetFileRequest(payload)) {
            return await setFileHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetFileRequest(payload)) {
            return await getFileHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isSetWorkspaceUsersRequest(payload)) {
            return await setWorkspaceUsersHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isSetWorkspacePropertyRequest(payload)) {
            return await setWorkspacePropertyHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetDataBlobRequest(payload)) {
            return await getDataBlobHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isDeleteProjectRequest(payload)) {
            return await deleteProjectHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isSetProjectPropertyRequest(payload)) {
            return await setProjectPropertyHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetComputeResourcesRequest(payload)) {
            return await getComputeResourcesHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetComputeResourceRequest(payload)) {
            return await getComputeResourceHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isRegisterComputeResourceRequest(payload)) {
            return await registerComputeResourceHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isDeleteComputeResourceRequest(payload)) {
            return await deleteComputeResourceHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isCreateJobRequest(payload)) {
            return await createJobHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isDeleteJobRequest(payload)) {
            return await deleteJobHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetJobRequest(payload)) {
            return await getJobHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetJobsRequest(payload)) {
            return await getJobsHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetActiveComputeResourceNodesRequest(payload)) {
            return await getActiveComputeResourceNodesHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isSetJobPropertyRequest(payload)) {
            return await setJobPropertyHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isDeleteFileRequest(payload)) {
            return await deleteFileHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isDuplicateFileRequest(payload)) {
            return await duplicateFileHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isRenameFileRequest(payload)) {
            return await renameFileHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetPubsubSubscriptionRequest(payload)) {
            return await getPubsubSubscriptionHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isSetComputeResourceSpecRequest(payload)) {
            return await setComputeResourceSpecHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else if (isGetComputeResourceSpecRequest(payload)) {
            return await getComputeResourceSpecHandler(payload, {verifiedClientId, verifiedUserId})
        }
        else {
            throw Error(`Unexpected request type: ${(payload as any).type}`)
        }
    })().then((response) => {
        res.json(response)
    }).catch((error: Error) => {
        console.warn(error.message)
        res.status(500).send(`Error: ${error.message}`)
    })
}

const handleProcessorRequest = async (request: ProtocaasProcessorRequest): Promise<ProtocaasProcessorResponse> => {
    if (isProcessorGetJobRequest(request)) {
        return await processorGetJobHandler(request)
    }
    else if (isProcessorSetJobStatusRequest(request)) {
        return await processorSetJobStatusHandler(request)
    }
    else if (isProcessorSetJobConsoleOutputRequest(request)) {
        return await processorSetJobConsoleOutputHandler(request)
    }
    else {
        throw Error(`Unexpected processor request type: ${(request as any).type}`)
    }
}