import { DeleteComputeResourceRequest, DeleteComputeResourceResponse } from "../../src/types/ProtocaasRequest";
import { isProtocaasComputeResource } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import removeIdField from "../removeIdField";

const deleteComputeResourceHandler = async (request: DeleteComputeResourceRequest, o: {verifiedClientId?: string, verifiedUserId?: string}): Promise<DeleteComputeResourceResponse> => {
    const userId = o.verifiedUserId
    const client = await getMongoClient()
    const computeResourcesCollection = client.db('protocaas').collection('computeResources')

    const computeResourceId = request.computeResourceId

    const cr = removeIdField(await computeResourcesCollection.findOne({computeResourceId}))
    if (!cr) {
        throw new Error('Compute resource not found')
    }
    if (!isProtocaasComputeResource(cr)) {
        console.warn(cr)
        throw new Error('Invalid compute resource in database (2)')
    }
    if (cr.ownerId !== userId) {
        throw new Error('You do not have permission to delete this compute resource')
    }

    await computeResourcesCollection.deleteOne({computeResourceId})

    return {
        type: 'deleteComputeResource'
    }
}

export default deleteComputeResourceHandler