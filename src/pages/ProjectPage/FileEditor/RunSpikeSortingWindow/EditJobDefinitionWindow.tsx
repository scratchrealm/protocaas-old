import { FunctionComponent, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { ProtocaasProcessingJobDefinition, ProtocaasProcessingJobDefinitionAction } from "../../../../dbInterface/dbInterface";
import { RemoteH5File } from "../../../../RemoteH5File/RemoteH5File";
import { ComputeResourceSpecProcessor, ComputeResourceSpecProcessorParameter } from "../../../../types/protocaas-types";
import { useElectricalSeriesPaths } from "../NwbFileEditor";



type EditJobDefinitionWindowProps = {
    jobDefinition: ProtocaasProcessingJobDefinition | undefined
    jobDefinitionDispatch: (action: ProtocaasProcessingJobDefinitionAction) => void
    processor: ComputeResourceSpecProcessor
    nwbFile?: RemoteH5File
    setValid: (valid: boolean) => void
}

type validParametersState = {
    [key: string]: boolean
}

type validParametersAction = {
    type: 'setValid'
    name: string
    valid: boolean
}

const validParametersReducer = (state: validParametersState, action: validParametersAction) => {
    if (action.type === 'setValid') {
        // check if no change
        if (state[action.name] === action.valid) return state
        return {
            ...state,
            [action.name]: action.valid
        }
    }
    else return state
}

const EditJobDefinitionWindow: FunctionComponent<EditJobDefinitionWindowProps> = ({jobDefinition, jobDefinitionDispatch, processor, nwbFile, setValid}) => {
    const setParameterValue = useCallback((name: string, value: any) => {
        jobDefinitionDispatch({
            type: 'setInputParameter',
            name,
            value
        })
    }, [jobDefinitionDispatch])

    const [validParameters, validParametersDispatch] = useReducer(validParametersReducer, {})
    const allParametersAreValid = useMemo(() => {
        for (const name in validParameters) {
            if (!validParameters[name]) return false
        }
        return true
    }, [validParameters])
    useEffect(() => {
        setValid(allParametersAreValid)
    }, [allParametersAreValid, setValid])

    const rows = useMemo(() => {
        const ret: any[] = []
        processor.inputs.forEach(input => {
            ret.push(
                <InputRow
                    key={input.name}
                    name={input.name}
                    description={input.help}
                    value={jobDefinition?.inputFiles.find(f => (f.name === input.name))?.fileName}
                />
            )
        })
        processor.outputs.forEach(output => {
            ret.push(
                <OutputRow
                    key={output.name}
                    name={output.name}
                    description={output.help}
                    value={jobDefinition?.outputFiles.find(f => (f.name === output.name))?.fileName}
                />
            )
        })
        processor.parameters.forEach(parameter => {
            ret.push(
                <ParameterRow
                    key={parameter.name}
                    parameter={parameter}
                    value={jobDefinition?.inputParameters.find(f => (f.name === parameter.name))?.value}
                    nwbFile={nwbFile}
                    setValue={value => {
                        setParameterValue(parameter.name, value)
                    }}
                    setValid={valid => {
                        validParametersDispatch({
                            type: 'setValid',
                            name: parameter.name,
                            valid
                        })
                    }}
                />
            )
        })
        return ret
    }, [processor, jobDefinition, nwbFile, setParameterValue])
    return (
        <div>
            <table className="table1">
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>
    )
}

type InputRowProps = {
    name: string
    description: string
    value?: string
}

const InputRow: FunctionComponent<InputRowProps> = ({name, description, value}) => {
    return (
        <tr>
            <td>{name}</td>
            <td>{value}</td>
            <td>{description}</td>
        </tr>
    )
}

type OutputRowProps = {
    name: string
    description: string
    value?: string
}

const OutputRow: FunctionComponent<OutputRowProps> = ({name, description, value}) => {
    return (
        <tr>
            <td>{name}</td>
            <td>{value}</td>
            <td>{description}</td>
        </tr>
    )
}

type ParameterRowProps = {
    parameter: ComputeResourceSpecProcessorParameter
    value: any
    nwbFile?: RemoteH5File
    setValue: (value: any) => void
    setValid: (valid: boolean) => void
}

const ParameterRow: FunctionComponent<ParameterRowProps> = ({parameter, value, nwbFile, setValue, setValid}) => {
    const {type, name, help} = parameter
    return (
        <tr>
            <td title={`${name} (${type})`}>{name}</td>
            <td>
                <EditParameterValue
                    parameter={parameter}
                    value={value}
                    nwbFile={nwbFile}
                    setValue={setValue}
                    setValid={setValid}
                />
            </td>
            <td>{help}</td>
        </tr>
    )
}

type EditParameterValueProps = {
    parameter: ComputeResourceSpecProcessorParameter
    value: any
    nwbFile?: RemoteH5File
    setValue: (value: any) => void
    setValid: (valid: boolean) => void
}

const EditParameterValue: FunctionComponent<EditParameterValueProps> = ({parameter, value, nwbFile, setValue, setValid}) => {
    const {type, name} = parameter
    if (name === 'electrical_series_path') {
        return <ElectricalSeriesPathSelector value={value} nwbFile={nwbFile} setValue={setValue} />
    }
    else if (type === 'str') {
        return <input type="text" value={value} onChange={evt => {setValue(evt.target.value)}} />
    }
    else if (type === 'int') {
        return <IntEdit value={value} setValue={setValue} setValid={setValid} />
    }
    else if (type === 'float') {
        return <FloatEdit value={value} setValue={setValue} setValid={setValid} />
    }
    else if (type === 'bool') {
        return <input type="checkbox" checked={value === 'true'} onChange={evt => {setValue(evt.target.checked ? 'true' : 'false')}} />
    }
    else if (type === 'Enum') {
        return <div>Enum not implemented yet</div>
        // const choices = parameter.choices || []
        // return (
        //     <select value={value} onChange={evt => {setValue(evt.target.value)}}>
        //         {
        //             choices.map(choice => (
        //                 <option key={choice} value={choice}>{choice}</option>
        //             ))
        //         }
        //     </select>
        // )
    }
    else {
        return <div>Unsupported type: {type}</div>
    }
}

type FloatEditProps = {
    value: any
    setValue: (value: number) => void
    setValid: (valid: boolean) => void
}

const FloatEdit: FunctionComponent<FloatEditProps> = ({value, setValue, setValid}) => {
    const [internalValue, setInternalValue] = useState<string | undefined>(undefined)
    useEffect(() => {
        if (isFloatType(value)) {
            setInternalValue(old => {
                if ((old !== undefined) && (stringIsValidFloat(old)) && (parseFloat(old) === value)) return old
                return `${value}`
            })
        }
    }, [value])

    useEffect(() => {
        if (internalValue === undefined) return
        if (stringIsValidFloat(internalValue)) {
            setValue(parseFloat(internalValue))
            setValid(true)
        }
        else {
            setValid(false)
        }
    }, [internalValue, setValue, setValid])

    const isValid = useMemo(() => {
        if (internalValue === undefined) return false
        return stringIsValidFloat(internalValue)
    }, [internalValue])

    return (
        <span>
            <input type="text" value={internalValue || ''} onChange={evt => {setInternalValue(evt.target.value)}} />
            {
                isValid ? null : <span style={{color: 'red'}}>x</span>
            }
        </span>
    )
}

const isFloatType = (x: any) => {
    return (typeof(x) === 'number') && (!isNaN(x))
}

function stringIsValidFloat(s: string) {
    const floatRegex = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;
    return floatRegex.test(s);
}

type IntEditProps = {
    value: any
    setValue: (value: number) => void
    setValid: (valid: boolean) => void
}

const IntEdit: FunctionComponent<IntEditProps> = ({value, setValue, setValid}) => {
    const [internalValue, setInternalValue] = useState<string | undefined>(undefined)
    useEffect(() => {
        if (isIntType(value)) {
            setInternalValue(old => {
                if ((old !== undefined) && (stringIsValidInt(old)) && (parseInt(old) === value)) return old
                return `${value}`
            })
        }
    }, [value])

    useEffect(() => {
        if (internalValue === undefined) return
        if (stringIsValidInt(internalValue)) {
            setValue(parseInt(internalValue))
            setValid(true)
        }
        else {
            setValid(false)
        }
    }, [internalValue, setValue, setValid])

    const isValid = useMemo(() => {
        if (internalValue === undefined) return false
        return stringIsValidInt(internalValue)
    }, [internalValue])

    return (
        <span>
            <input type="text" value={internalValue || ''} onChange={evt => {setInternalValue(evt.target.value)}} />
            {
                isValid ? null : <span style={{color: 'red'}}>x</span>
            }
        </span>
    )
}

const isIntType = (x: any) => {
    return (typeof(x) === 'number') && (!isNaN(x)) && (Math.floor(x) === x)
}

function stringIsValidInt(s: string) {
    const intRegex = /^[-+]?[0-9]+$/;
    return intRegex.test(s);
}

type ElectricalSeriesPathSelectorProps = {
    value?: string
    nwbFile?: RemoteH5File
    setValue: (value: string) => void
}

const ElectricalSeriesPathSelector: FunctionComponent<ElectricalSeriesPathSelectorProps> = ({value, nwbFile, setValue}) => {
    const electricalSeriesPaths = useElectricalSeriesPaths(nwbFile)

    useEffect(() => {
        if (value) return
        if (!electricalSeriesPaths) return
        if (electricalSeriesPaths.length === 0) return
        setValue(electricalSeriesPaths[0])
    }, [value, electricalSeriesPaths, setValue])

    if (!electricalSeriesPaths) return <div>Loading...</div>
    if (electricalSeriesPaths.length === 0) return <div>No electrical series found.</div>
    return (
        <select value={value} onChange={evt => {setValue(evt.target.value)}}>
            {
                [...electricalSeriesPaths].map(path => (
                    <option key={path} value={path}>{path}</option>
                ))
            }
        </select>
    )
}

export default EditJobDefinitionWindow