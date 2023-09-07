import { isProtocaasComputeResource } from "../../src/types/protocaas-types"
import { getMongoClient } from "../getMongoClient"
import JSONStringifyDeterministic from "../jsonStringifyDeterministic"
import removeIdField from "../removeIdField"
import verifySignature from "../verifySignature"
import { ComputeResourceSetSpecRequest, ComputeResourceSetSpecResponse } from "./ProtocaasComputeResourceRequest"

const computeResourceSetSpecHandler = async (request: ComputeResourceSetSpecRequest): Promise<ComputeResourceSetSpecResponse> => {
    const client = await getMongoClient()

    const computeResourcesCollection = client.db('protocaas').collection('computeResources')
    const computeResource = removeIdField(await computeResourcesCollection.findOne({computeResourceId: request.computeResourceId}))
    if (!isProtocaasComputeResource(computeResource)) {
        console.warn(computeResource)
        throw new Error('Invalid compute resource in database (7)')
    }
    const okay = await verifySignature(JSONStringifyDeterministic({type: 'computeResource.setSpec'}), computeResource.computeResourceId, request.signature)
    if (!okay) {
        throw new Error('Invalid signature for computeResource.setSpec')
    }

    const update = {
        $set: {
            spec: request.spec
        }
    }

    await computeResourcesCollection.updateOne({computeResourceId: request.computeResourceId}, update)

    return {
        type: 'computeResource.setSpec'
    }
}

export default computeResourceSetSpecHandler