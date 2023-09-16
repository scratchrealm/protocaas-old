import validateObject, { isArrayOf, isBoolean, isEqualTo, isNumber, isOneOf, isString, optional } from "../../src/types/validateObject";
import {ComputeResourceAwsBatchOpts, ComputeResourceSlurmOpts, ComputeResourceSpec, isComputeResourceAwsBatchOpts, isComputeResourceSlurmOpts, isComputeResourceSpec, isProtocaasJob, ProtocaasJob} from "../../src/types/protocaas-types"

// computeResource.getUnfinishedJobs

export type ComputeResourceGetUnfinishedJobsRequest = {
    type: 'computeResource.getUnfinishedJobs'
    computeResourceId: string
    signature: string
    nodeId: string
    nodeName: string
}

export const isComputeResourceGetUnfinishedJobsRequest = (x: any): x is ComputeResourceGetUnfinishedJobsRequest => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getUnfinishedJobs'),
        computeResourceId: isString,
        signature: isString,
        nodeId: isString,
        nodeName: isString
    })
}

export type ComputeResourceGetUnfinishedJobsResponse = {
    type: 'computeResource.getUnfinishedJobs'
    jobs: ProtocaasJob[]
}

export const isComputeResourceGetUnfinishedJobsResponse = (x: any): x is ComputeResourceGetUnfinishedJobsResponse => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getUnfinishedJobs'),
        jobs: isArrayOf(isProtocaasJob)
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
        awsBatch?: ComputeResourceAwsBatchOpts
        slurm?: ComputeResourceSlurmOpts
    }[]
}

export const isComputeResourceGetAppsResponse = (x: any): x is ComputeResourceGetAppsResponse => {
    return validateObject(x, {
        type: isEqualTo('computeResource.getApps'),
        apps: isArrayOf(y => validateObject(y, {
            name: isString,
            executablePath: isString,
            container: optional(isString),
            awsBatch: optional(isComputeResourceAwsBatchOpts),
            slurm: optional(isComputeResourceSlurmOpts)
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

// computeResource.setSpec

export type ComputeResourceSetSpecRequest = {
    type: 'computeResource.setSpec'
    computeResourceId: string
    signature: string
    spec?: ComputeResourceSpec
}

export const isComputeResourceSetSpecRequest = (x: any): x is ComputeResourceSetSpecRequest => {
    return validateObject(x, {
        type: isEqualTo('computeResource.setSpec'),
        computeResourceId: isString,
        signature: isString,
        spec: optional(isComputeResourceSpec)
    })
}

export type ComputeResourceSetSpecResponse = {
    type: 'computeResource.setSpec'
}

export const isComputeResourceSetSpecResponse = (x: any): x is ComputeResourceSetSpecResponse => {
    return validateObject(x, {
        type: isEqualTo('computeResource.setSpec')
    })
}

//////////////////////////////////////////////////////////////////////////////

export type ProtocaasComputeResourceRequest =
    ComputeResourceGetUnfinishedJobsRequest |
    ComputeResourceGetAppsRequest |
    ComputeResourceGetPubsubSubscriptionRequest |
    ComputeResourceSetSpecRequest

export const isProtocaasComputeResourceRequest = (x: any): x is ProtocaasComputeResourceRequest => {
    return isOneOf([
        isComputeResourceGetUnfinishedJobsRequest,
        isComputeResourceGetAppsRequest,
        isComputeResourceGetPubsubSubscriptionRequest,
        isComputeResourceSetSpecRequest
    ])(x)
}

export type ProtocaasComputeResourceResponse =
    ComputeResourceGetUnfinishedJobsResponse |
    ComputeResourceGetAppsResponse |
    ComputeResourceGetPubsubSubscriptionResponse |
    ComputeResourceSetSpecResponse

export const isProtocaasComputeResourceResponse = (x: any): x is ProtocaasComputeResourceResponse => {
    return isOneOf([
        isComputeResourceGetUnfinishedJobsResponse,
        isComputeResourceGetAppsResponse,
        isComputeResourceGetPubsubSubscriptionResponse,
        isComputeResourceSetSpecResponse
    ])(x)
}