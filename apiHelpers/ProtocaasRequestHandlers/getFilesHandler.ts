import { GetFilesRequest, GetFilesResponse } from "../../src/types/ProtocaasRequest";
import { isProtocaasFile } from "../../src/types/protocaas-types";
import getProject from "../getProject";
import { getMongoClient } from "../getMongoClient";
import getWorkspace from "../getWorkspace";
import { userCanReadWorkspace } from "../permissions";
import removeIdField from "../removeIdField";

const getFilesHandler = async (request: GetFilesRequest, o: {verifiedClientId?: string, verifiedUserId?: string}): Promise<GetFilesResponse> => {
    const client = await getMongoClient()
    const filesCollection = client.db('protocaas').collection('files')

    const project = await getProject(request.projectId, {useCache: true})
    
    const workspaceId = project.workspaceId
    const workspace = await getWorkspace(workspaceId, {useCache: true})
    if (!userCanReadWorkspace(workspace, o.verifiedUserId, o.verifiedClientId)) {
        throw new Error('User does not have permission to read this workspace')
    }

    const files = removeIdField(await filesCollection.find({
        projectId: request.projectId
    }).toArray())
    for (const file of files) {
        if (!isProtocaasFile(file)) {
            console.warn(file)

            // // during development only:
            // await filesCollection.deleteOne({
            //     projectId: request.projectId,
            //     fileName: file.fileName
            // })

            throw new Error('Invalid project file in database (3)')
        }
    }
    return {
        type: 'getFiles',
        files
    }
}

export default getFilesHandler