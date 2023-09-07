import { isProtocaasComputeResource } from "../../src/types/protocaas-types"
import { getMongoClient } from "../getMongoClient"
import JSONStringifyDeterministic from "../jsonStringifyDeterministic"
import removeIdField from "../removeIdField"
import verifySignature from "../verifySignature"
import { ComputeResourceGetPubsubSubscriptionRequest, ComputeResourceGetPubsubSubscriptionResponse } from "./ProtocaasComputeResourceRequest"

const computeResourceGetPubsubSubscriptionHandler = async (request: ComputeResourceGetPubsubSubscriptionRequest): Promise<ComputeResourceGetPubsubSubscriptionResponse> => {
    const client = await getMongoClient()

    const computeResourcesCollection = client.db('protocaas').collection('computeResources')
    const computeResource = removeIdField(await computeResourcesCollection.findOne({computeResourceId: request.computeResourceId}))
    if (!isProtocaasComputeResource(computeResource)) {
        console.warn(computeResource)
        throw new Error('Invalid compute resource in database (6)')
    }
    const okay = await verifySignature(JSONStringifyDeterministic({type: 'computeResource.getPubsubSubscription'}), computeResource.computeResourceId, request.signature)
    if (!okay) {
        throw new Error('Invalid signature for computeResource.getPubsubSubscription')
    }

    if (!process.env.VITE_PUBNUB_SUBSCRIBE_KEY) {
        throw Error('Environment variable not set: VITE_PUBNUB_SUBSCRIBE_KEY')
    }
    const subscription = {
        pubnubSubscribeKey: process.env.VITE_PUBNUB_SUBSCRIBE_KEY,
        pubnubChannel: request.computeResourceId,
        pubnubUser: request.computeResourceId
    }

    return {
        type: 'computeResource.getPubsubSubscription',
        subscription
    }
}

export default computeResourceGetPubsubSubscriptionHandler