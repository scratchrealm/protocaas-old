import { isProtocaasFile, isProtocaasJob, isProtocaasProject, ProtocaasFile, ProtocaasJob, ProtocaasProject } from "../../src/types/protocaas-types";
import validateObject, { isArrayOf, isEqualTo, isOneOf, isString } from "../../src/types/validateObject";

// client.loadProject

export type ClientLoadProjectRequest = {
    type: 'client.loadProject'
    projectId: string
}

export const isClientLoadProjectRequest = (x: any): x is ClientLoadProjectRequest => {
    return validateObject(x, {
        type: isEqualTo('client.loadProject'),
        projectId: isString
    })
}

export type ClientLoadProjectResponse = {
    type: 'client.loadProject'
    project: ProtocaasProject
    files: ProtocaasFile[]
    jobs: ProtocaasJob[]
}

export const isClientLoadProjectResponse = (x: any): x is ClientLoadProjectResponse => {
    return validateObject(x, {
        type: isEqualTo('client.loadProject'),
        project: isProtocaasProject,
        files: isArrayOf(isProtocaasFile),
        jobs: isArrayOf(isProtocaasJob)
    })
}

//////////////////////////////////////////////////////////////////////////////

export type ProtocaasClientRequest =
    ClientLoadProjectRequest

export const isProtocaasClientRequest = (x: any): x is ProtocaasClientRequest => {
    return isOneOf([
        isClientLoadProjectRequest
    ])(x)
}

export type ProtocaasClientResponse =
    ClientLoadProjectResponse

export const isProtocaasClientResponse = (x: any): x is ProtocaasClientResponse => {
    return isOneOf([
        isClientLoadProjectResponse
    ])(x)
}