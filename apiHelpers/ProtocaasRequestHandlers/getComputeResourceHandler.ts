import { GetComputeResourceRequest, GetComputeResourceResponse } from "../../src/types/ProtocaasRequest";
import { isProtocaasComputeResource } from "../../src/types/protocaas-types";
import { getMongoClient } from "../getMongoClient";
import removeIdField from "../removeIdField";

const getComputeResourceHandler = async (request: GetComputeResourceRequest, o: {verifiedClientId?: string, verifiedUserId?: string}): Promise<GetComputeResourceResponse> => {
    const client = await getMongoClient()
    const computeResourcesCollection = client.db('protocaas').collection('computeResources')
    
    const computeResource = removeIdField(await computeResourcesCollection.findOne({computeResourceId: request.computeResourceId}))
    if (!isProtocaasComputeResource(computeResource)) {
        console.warn(computeResource)
        throw new Error('Invalid compute resource in database (1)')
    }
    return {
        type: 'getComputeResource',
        computeResource
    }
}

export default getComputeResourceHandler