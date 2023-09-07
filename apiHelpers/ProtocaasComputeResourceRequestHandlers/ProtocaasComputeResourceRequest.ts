import validateObject, { isArrayOf, isBoolean, isEqualTo, isNumber, isOneOf, isString, optional } from "../../src/types/validateObject";

// computeResource.getPendingJobs

export type ComputeResourceGetPendingJobsRequest = {
    type: 'computeResource.getPendingJobs'
    computeResourceId: string
    signature: string
    nodeId: string
    nodeName: string
}

export const isComputeResourceGetPendingJobsRequest = (x: any): x is ComputeResourceGetPendingJobsRequest => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getPendingJobs'),
        computeResourceId: isString,
        signature: isString,
        nodeId: isString,
        nodeName: isString
    })
}

export type ComputeResourceGetPendingJobsResponse = {
    type: 'computeResource.getPendingJobs'
    jobs: {
        jobId: string
        jobPrivateKey: string
        processorName: string
    }[]
}

export const isComputeResourceGetPendingJobsResponse = (x: any): x is ComputeResourceGetPendingJobsResponse => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getPendingJobs'),
        jobs: isArrayOf(y => validateObject(y, {
            jobId: isString,
            jobPrivateKey: isString,
            processorName: isString
        }))
    })
}

// computeResource.getApps

export type ComputeResourceGetAppsRequest = {
    type: 'computeResource.getApps'
    computeResourceId: string
    signature: string
}

export const isComputeResourceGetAppsRequest = (x: any): x is ComputeResourceGetAppsRequest => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getApps'),
        computeResourceId: isString,
        signature: isString
    })
}

export type ComputeResourceGetAppsResponse = {
    type: 'computeResource.getApps'
    apps: {
        name: string
        executablePath: string
        container?: string
    }[]
}

export const isComputeResourceGetAppsResponse = (x: any): x is ComputeResourceGetAppsResponse => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getApps'),
        apps: isArrayOf(y => validateObject(y, {
            name: isString,
            executablePath: isString,
            container: optional(isString)
        }))
    })
}

// computeResource.getPubsubSubscription

export type ComputeResourceGetPubsubSubscriptionRequest = {
    type: 'computeResource.getPubsubSubscription'
    computeResourceId: string
    signature: string
}

export const isComputeResourceGetPubsubSubscriptionRequest = (x: any): x is ComputeResourceGetPubsubSubscriptionRequest => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getPubsubSubscription'),
        computeResourceId: isString,
        signature: isString
    })
}

export type ComputeResourceGetPubsubSubscriptionResponse = {
    type: 'computeResource.getPubsubSubscription'
    subscription: {
        pubnubSubscribeKey: string
        pubnubChannel: string
        pubnubUser: string
    }
}

export const isComputeResourceGetPubsubSubscriptionResponse = (x: any): x is ComputeResourceGetPubsubSubscriptionResponse => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getPubsubSubscription'),
        subscription: y => validateObject(y, {
            pubnubSubscribeKey: isString,
            pubnubChannel: isString,
            pubnubUser: isString
        })
    })
}

//////////////////////////////////////////////////////////////////////////////

export type ProtocaasComputeResourceRequest =
    ComputeResourceGetPendingJobsRequest |
    ComputeResourceGetAppsRequest |
    ComputeResourceGetPubsubSubscriptionRequest

export const isProtocaasComputeResourceRequest = (x: any): x is ProtocaasComputeResourceRequest => {
    return isOneOf([
        isComputeResourceGetPendingJobsRequest,
        isComputeResourceGetAppsRequest,
        isComputeResourceGetPubsubSubscriptionRequest
    ])(x)
}

export type ProtocaasComputeResourceResponse =
    ComputeResourceGetPendingJobsResponse |
    ComputeResourceGetAppsResponse |
    ComputeResourceGetPubsubSubscriptionResponse

export const isProtocaasComputeResourceResponse = (x: any): x is ProtocaasComputeResourceResponse => {
    return isOneOf([
        isComputeResourceGetPendingJobsResponse,
        isComputeResourceGetAppsResponse,
        isComputeResourceGetPubsubSubscriptionResponse
    ])(x)
}