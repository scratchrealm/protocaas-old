import { isProtocaasComputeResource } from "../../src/types/protocaas-types"
import { getMongoClient } from "../getMongoClient"
import JSONStringifyDeterministic from "../jsonStringifyDeterministic"
import removeIdField from "../removeIdField"
import verifySignature from "../verifySignature"
import { ComputeResourceGetAppsRequest, ComputeResourceGetAppsResponse } from "./ProtocaasComputeResourceRequest"

const computeResourceGetAppsHandler = async (request: ComputeResourceGetAppsRequest): Promise<ComputeResourceGetAppsResponse> => {
    const client = await getMongoClient()

    const computeResourcesCollection = client.db('protocaas').collection('computeResources')
    const computeResource = removeIdField(await computeResourcesCollection.findOne({computeResourceId: request.computeResourceId}))
    if (!isProtocaasComputeResource(computeResource)) {
        console.warn(computeResource)
        throw new Error('Invalid compute resource in database (6)')
    }
    const okay = await verifySignature(JSONStringifyDeterministic({type: 'computeResource.getApps'}), computeResource.computeResourceId, request.signature)
    if (!okay) {
        throw new Error('Invalid signature for computeResource.getApps')
    }

    return {
        type: 'computeResource.getApps',
        apps: computeResource.apps
    }
}

export default computeResourceGetAppsHandler