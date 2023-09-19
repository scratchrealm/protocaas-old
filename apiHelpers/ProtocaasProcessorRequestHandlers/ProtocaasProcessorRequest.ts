import validateObject, { isArrayOf, isBoolean, isEqualTo, isOneOf, isString, optional } from "../../src/types/validateObject";

// processor.getJob

export type ProcessorGetJobRequest = {
    type: 'processor.getJob'
    jobId: string
    jobPrivateKey: string
}

export const isProcessorGetJobRequest = (x: any): x is ProcessorGetJobRequest => {
    return validateObject(x, {
        type: isEqualTo('processor.getJob'),
        jobId: isString,
        jobPrivateKey: isString
    })
}

export type ProcessorGetJobResponse = {
    type: 'processor.getJob'
    jobId: string
    status: string
    processorName: string
    inputs: {
        name: string
        url: string
    }[]
    outputs: {
        name: string
    }[]
    parameters: {
        name: string
        value: string
    }[]
}

export const isProcessorGetJobResponse = (x: any): x is ProcessorGetJobResponse => {
    return validateObject(x, {
        type: isEqualTo('processor.getJob'),
        jobId: isString,
        status: isString,
        processorName: isString,
        inputs: isArrayOf(y => validateObject(y, {
            name: isString,
            url: isString
        })),
        outputs: isArrayOf(y => validateObject(y, {
            name: isString
        })),
        parameters: isArrayOf(y => validateObject(y, {
            name: isString,
            value: isString
        }))
    })
}

// processor.setJobStatus

export type ProcessorSetJobStatusRequest = {
    type: 'processor.setJobStatus'
    jobId: string
    jobPrivateKey: string
    status: string
    error?: string
}

export const isProcessorSetJobStatusRequest = (x: any): x is ProcessorSetJobStatusRequest => {
    return validateObject(x, {
        type: isEqualTo('processor.setJobStatus'),
        jobId: isString,
        jobPrivateKey: isString,
        status: isString,
        error: optional(isString)
    })
}

export type ProcessorSetJobStatusResponse = {
    type: 'processor.setJobStatus'
    success: boolean
    error?: string
}

export const isProcessorSetJobStatusResponse = (x: any): x is ProcessorSetJobStatusResponse => {
    return validateObject(x, {
        type: isEqualTo('processor.setJobStatus'),
        success: isBoolean,
        error: optional(isString)
    })
}

// processor.setJobConsoleOutput

export type ProcessorSetJobConsoleOutputRequest = {
    type: 'processor.setJobConsoleOutput'
    jobId: string
    jobPrivateKey: string
    consoleOutput: string
}

export const isProcessorSetJobConsoleOutputRequest = (x: any): x is ProcessorSetJobConsoleOutputRequest => {
    return validateObject(x, {
        type: isEqualTo('processor.setJobConsoleOutput'),
        jobId: isString,
        jobPrivateKey: isString,
        consoleOutput: isString
    })
}

export type ProcessorSetJobConsoleOutputResponse = {
    type: 'processor.setJobConsoleOutput'
}

export const isProcessorSetJobConsoleOutputResponse = (x: any): x is ProcessorSetJobConsoleOutputResponse => {
    return validateObject(x, {
        type: isEqualTo('processor.setJobConsoleOutput')
    })
}

// processor.getOutputUploadUrl

export type ProcessorGetOutputUploadUrlRequest = {
    type: 'processor.getOutputUploadUrl'
    jobId: string
    jobPrivateKey: string
    outputName: string
}

export const isProcessorGetOutputUploadUrlRequest = (x: any): x is ProcessorGetOutputUploadUrlRequest => {
    return validateObject(x, {
        type: isEqualTo('processor.getOutputUploadUrl'),
        jobId: isString,
        jobPrivateKey: isString,
        outputName: isString
    })
}

export type ProcessorGetOutputUploadUrlResponse = {
    type: 'processor.getOutputUploadUrl'
    uploadUrl: string
}

export const isProcessorGetOutputUploadUrlResponse = (x: any): x is ProcessorGetOutputUploadUrlResponse => {
    return validateObject(x, {
        type: isEqualTo('processor.getOutputUploadUrl'),
        uploadUrl: isString
    })
}

//////////////////////////////////////////////////////////////////////////////

export type ProtocaasProcessorRequest =
    ProcessorGetJobRequest |
    ProcessorSetJobStatusRequest |
    ProcessorSetJobConsoleOutputRequest |
    ProcessorGetOutputUploadUrlRequest

export const isProtocaasProcessorRequest = (x: any): x is ProtocaasProcessorRequest => {
    return isOneOf([
        isProcessorGetJobRequest,
        isProcessorSetJobStatusRequest,
        isProcessorSetJobConsoleOutputRequest,
        isProcessorGetOutputUploadUrlRequest
    ])(x)
}

export type ProtocaasProcessorResponse =
    ProcessorGetJobResponse |
    ProcessorSetJobStatusResponse |
    ProcessorSetJobConsoleOutputResponse |
    ProcessorGetOutputUploadUrlResponse

export const isProtocaasProcessorResponse = (x: any): x is ProtocaasProcessorResponse => {
    return isOneOf([
        isProcessorGetJobResponse,
        isProcessorSetJobStatusResponse,
        isProcessorSetJobConsoleOutputResponse,
        isProcessorGetOutputUploadUrlResponse
    ])(x)
}