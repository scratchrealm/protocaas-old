import { FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import { ProtocaasProcessingJobDefinition } from "../../../../dbInterface/dbInterface";
import { RemoteH5File } from "../../../../RemoteH5File/RemoteH5File";
import { ComputeResourceSpecProcessor, ComputeResourceSpecProcessorParameter } from "../../../../types/protocaas-types";
import { useElectricalSeriesPaths } from "../NwbFileEditor";

type EditJobDefinitionWindowProps = {
    jobDefinition: ProtocaasProcessingJobDefinition | undefined
    setJobDefinition: (jobDefinition: ProtocaasProcessingJobDefinition | undefined) => void
    processor: ComputeResourceSpecProcessor
    nwbFile?: RemoteH5File
}

const EditJobDefinitionWindow: FunctionComponent<EditJobDefinitionWindowProps> = ({jobDefinition, setJobDefinition, processor, nwbFile}) => {
    const setParameterValue = useCallback((name: string, value: any) => {
        if (!jobDefinition) return
        const newJobDefinition: ProtocaasProcessingJobDefinition = {
            ...jobDefinition,
            inputParameters: jobDefinition.inputParameters.map(p => {
                if (p.name === name) {
                    return {
                        ...p,
                        value
                    }
                }
                else return p
            })
        }
        setJobDefinition(newJobDefinition)
    }, [jobDefinition, setJobDefinition])
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
}

const ParameterRow: FunctionComponent<ParameterRowProps> = ({parameter, value, nwbFile, setValue}) => {
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
}

const EditParameterValue: FunctionComponent<EditParameterValueProps> = ({parameter, value, nwbFile, setValue}) => {
    const {type, name} = parameter
    if (name === 'electrical_series_path') {
        return <ElectricalSeriesPathSelector value={value} nwbFile={nwbFile} setValue={setValue} />
    }
    else if (type === 'str') {
        return <input type="text" value={value} onChange={evt => {setValue(evt.target.value)}} />
    }
    else if (type === 'int') {
        return <IntEdit value={value} setValue={setValue} />
    }
    else if (type === 'float') {
        return <FloatEdit value={value} setValue={setValue} />
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

type IntEditProps = {
    value: any
    setValue: (value: number) => void
}

const IntEdit: FunctionComponent<IntEditProps> = ({value, setValue}) => {
    const [internalValue, setInternalValue] = useState<string>(value)
    useEffect(() => {
        if (isIntType(value)) {
            setInternalValue(old => {
                if (parseInt(old) === value) return old
                return `${value}`
            })
        }
    }, [value])

    useEffect(() => {
        if (stringIsInt(internalValue)) {
            setValue(parseInt(internalValue))
        }
    }, [internalValue, setValue])

    return <input type="text" value={internalValue} onChange={evt => {setInternalValue(evt.target.value)}} />
}

const isIntType = (x: any) => {
    return (typeof(x) === 'number') && (Math.floor(x) === x)
}

const stringIsInt = (x: string) => {
    return isIntType(parseInt(x))
}

type FloatEditProps = {
    value: any
    setValue: (value: number) => void
}

const FloatEdit: FunctionComponent<FloatEditProps> = ({value, setValue}) => {
    const [internalValue, setInternalValue] = useState<string>(value)
    useEffect(() => {
        if (isFloatType(value)) {
            setInternalValue(old => {
                if (parseFloat(old) === value) return old
                return `${value}`
            })
        }
    }, [value])

    useEffect(() => {
        if (stringIsFloat(internalValue)) {
            setValue(parseFloat(internalValue))
        }
    }, [internalValue, setValue])

    return <input type="text" value={internalValue} onChange={evt => {setInternalValue(evt.target.value)}} />
}

const isFloatType = (x: any) => {
    return (typeof(x) === 'number') && (!isNaN(x))
}

const stringIsFloat = (x: string) => {
    return isFloatType(parseFloat(x))
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