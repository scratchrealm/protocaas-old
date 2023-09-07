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
        status: isOneOf([isEqualTo('pending'), isEqualTo('queued'), isEqualTo('running'), isEqualTo('completed'), isEqualTo('failed')]),
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

export type ProtocaasComputeResource = {
    computeResourceId: string
    ownerId: string
    name: string
    timestampCreated: number
    apps: {
        name: string
        executablePath: string
        container?: string
    }[]
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
        })))
    })
}

export type ProcessingToolSchema = {
    description?: string
    properties: {
        name: string
        type: string
        description?: string
        default?: any
        choices?: any[]
        group?: string
    }[]
}

export const isProcessingToolSchema = (x: any): x is ProcessingToolSchema => {
    return validateObject(x, {
        description: optional(isString),
        properties: isArrayOf(y => (validateObject(y, {
            name: isString,
            type: isString,
            description: optional(isString),
            default: optional(() => true),
            choices: optional(() => true),
            group: optional(isString)
        })))
    })
}

export type ComputeResourceSpec = {
    processing_tools: {
        name: string
        attributes: any
        tags: string[]
        schema: ProcessingToolSchema
    }[]
}

export const isComputeResourceSpec = (x: any): x is ComputeResourceSpec => {
    return validateObject(x, {
        processing_tools: isArrayOf(y => (validateObject(y, {
            name: isString,
            attributes: () => true,
            tags: optional(isArrayOf(isString)),
            schema: isProcessingToolSchema
        })))
    })
}