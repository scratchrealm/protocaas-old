import validateObject, { isArrayOf, isBoolean, isEqualTo, isNumber, isOneOf, isString, optional } from "./validateObject"

export type ProtocaasWorkspace = {
    workspaceId: string
    ownerId: string
    name: string
    description: string
    users: {
        userId: string
        role: 'admin' | 'editor' | 'viewer'
    }[]
    publiclyReadable: boolean
    listed: boolean
    timestampCreated: number
    timestampModified: number
    computeResourceId?: string
}

export const isProtocaasWorkspace = (x: any): x is ProtocaasWorkspace => {
    return validateObject(x, {
        workspaceId: isString,
        ownerId: isString,
        name: isString,
        description: isString,
        users: isArrayOf(y => (validateObject(y, {
            userId: isString,
            role: isOneOf([isEqualTo('admin'), isEqualTo('editor'), isEqualTo('viewer')])
        }))),
        publiclyReadable: isBoolean,
        listed: isBoolean,
        timestampCreated: isNumber,
        timestampModified: isNumber,
        computeResourceId: optional(isString)
    })
}

export type ProtocaasProject = {
    projectId: string
    workspaceId: string
    name: string
    description: string
    timestampCreated: number
    timestampModified: number
}

export const isProtocaasProject = (x: any): x is ProtocaasProject => {
    return validateObject(x, {
        projectId: isString,
        workspaceId: isString,
        name: isString,
        description: isString,
        timestampCreated: isNumber,
        timestampModified: isNumber
    })
}

export type ProtocaasJob = {
    projectId: string
    workspaceId: string
    jobId: string
    jobPrivateKey: string
    userId: string
    processorName: string
    inputFiles: {
        name: string
        fileId: string
        fileName: string
    }[]
    inputFileIds: string[]
    inputParameters: {
        name: string
        value?: any
    }[]
    outputFiles: {
        name: string
        fileName: string
        fileId?: string
    }[]
    timestampCreated: number
    computeResourceId: string
    status: 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed'
    error?: string
    processVersion?: string
    computeResourceNodeId?: string
    computeResourceNodeName?: string
    consoleOutput?: string
    timestampQueued?: number
    timestampRunning?: number
    timestampFinished?: number
    outputFileIds?: string[]
}

export const isProtocaasJob = (x: any): x is ProtocaasJob => {
    return validateObject(x, {  
        projectId: isString,
        workspaceId: isString,
        jobId: isString,
        jobPrivateKey: isString,
        userId: isString,
        processorName: isString,
        inputFiles: isArrayOf(y => (validateObject(y, {
            name: isString,
            fileId: isString,
            fileName: isString
        }))),
        inputFileIds: isArrayOf(isString),
        inputParameters: isArrayOf(y => (validateObject(y, {
            name: isString,
            value: optional(() => true)
        }))),
        outputFiles: isArrayOf(y => (validateObject(y, {
            name: isString,
            fileName: isString,
            fileId: optional(isString)
        }))),
        timestampCreated: isNumber,
        computeResourceId: isString,
        status: isOneOf([isEqualTo('pending'), isEqualTo('queued'), isEqualTo('starting'), isEqualTo('running'), isEqualTo('completed'), isEqualTo('failed')]),
        error: optional(isString),
        processVersion: optional(isString),
        computeResourceNodeId: optional(isString),
        computeResourceNodeName: optional(isString),
        consoleOutput: optional(isString),
        timestampQueued: optional(isNumber),
        timestampRunning: optional(isNumber),
        timestampFinished: optional(isNumber),
        outputFileIds: optional(isArrayOf(isString))
    })
}

export type ProtocaasFile = {
    projectId: string
    workspaceId: string
    fileId: string
    userId: string
    fileName: string
    size: number
    timestampCreated: number
    content: string
    metadata: {
        [key: string]: any
    }
    jobId?: string
}

export const isProtocaasFile = (x: any): x is ProtocaasFile => {
    return validateObject(x, {
        projectId: isString,
        workspaceId: isString,
        fileId: isString,
        userId: isString,
        fileName: isString,
        size: isNumber,
        timestampCreated: isNumber,
        content: isString,
        metadata: () => true,
        jobId: optional(isString)
    })
}

export type ProtocaasDataBlob = {
    workspaceId: string
    projectId: string
    sha1: string
    size: number
    content: string
}

export const isProtocaasDataBlob = (x: any): x is ProtocaasDataBlob => {
    return validateObject(x, {
        workspaceId: isString,
        projectId: isString,
        sha1: isString,
        size: isNumber,
        content: isString
    })
}

export type ProtocaasComputeResourceApp = {
    name: string
    executablePath: string
    container?: string
}

export type ProtocaasComputeResource = {
    computeResourceId: string
    ownerId: string
    name: string
    timestampCreated: number
    apps: ProtocaasComputeResourceApp[]
    spec?: ComputeResourceSpec
}

export const isProtocaasComputeResource = (x: any): x is ProtocaasComputeResource => {
    return validateObject(x, {
        computeResourceId: isString,
        ownerId: isString,
        name: isString,
        timestampCreated: isNumber,
        apps: isArrayOf(y => (validateObject(y, {
            name: isString,
            executablePath: isString,
            container: optional(isString)
        }))),
        spec: optional(isComputeResourceSpec)
    })
}

export type ComputeResourceSpecProcessorParameter = {
    name: string
    help: string
    type: string
    default?: any
}

export type ComputeResourceSpecProcessor = {
    name: string
    help: string
    inputs: {
        name: string
        help: string
    }[]
    outputs: {
        name: string
        help: string
    }[]
    parameters: ComputeResourceSpecProcessorParameter[]
    attributes: {
        name: string
        value: any
    }[]
    tags: {
        tag: string
    }[]
}

export type ComputeResourceSpecApp = {
    name: string
    help: string
    processors: ComputeResourceSpecProcessor[]
}

export type ComputeResourceSpec = {
    apps: ComputeResourceSpecApp[]
}

export const isComputeResourceSpec = (x: any): x is ComputeResourceSpec => {
    return validateObject(x, {
        apps: isArrayOf(y => (validateObject(y, {
            name: isString,
            help: isString,
            processors: isArrayOf(z => (validateObject(z, {
                name: isString,
                help: isString,
                inputs: isArrayOf(a => (validateObject(a, {
                    name: isString,
                    help: isString
                }))),
                outputs: isArrayOf(a => (validateObject(a, {
                    name: isString,
                    help: isString
                }))),
                parameters: isArrayOf(a => (validateObject(a, {
                    name: isString,
                    help: isString,
                    type: isString,
                    default: optional(() => true)
                }))),
                attributes: isArrayOf(a => (validateObject(a, {
                    name: isString,
                    value: () => (true)
                }))),
                tags: isArrayOf(a => (validateObject(a, {
                    tag: isString
                })))
            })))
        })))
    })
}