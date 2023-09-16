import { isProtocaasComputeResource } from "../../src/types/protocaas-types";
import { SetComputeResourceAppsRequest, SetComputeResourceAppsResponse } from "../../src/types/ProtocaasRequest";
import { getMongoClient } from "../getMongoClient";
import removeIdField from "../removeIdField";

const setComputeResourceAppsHandler = async (request: SetComputeResourceAppsRequest, o: {verifiedClientId?: string, verifiedUserId?: string}): Promise<SetComputeResourceAppsResponse> => {
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
        throw new Error('Invalid compute resource in database (11)')
    }
    if (cr.ownerId !== userId) {
        throw new Error('You do not have permission to set the apps on this compute resource')
    }

    const update = {
        $set: {
            apps: request.apps
        }
    }

    await computeResourcesCollection.updateOne({computeResourceId}, update)

    return {
        type: 'setComputeResourceApps'
    }
}

export default setComputeResourceAppsHandler