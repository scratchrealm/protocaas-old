import { Edit } from "@mui/icons-material"
import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { ComputeResourceAwsBatchOpts, ComputeResourceSlurmOpts, ProtocaasComputeResource } from "../../types/protocaas-types"

type Props = {
    computeResource: ProtocaasComputeResource
    onNewApp: (name: string, executablePath: string, container: string, awsBatch?: ComputeResourceAwsBatchOpts, slurm?: ComputeResourceSlurmOpts) => void
}

const NewAppWindow: FunctionComponent<Props> = ({computeResource, onNewApp}) => {
    const [newAppName, setNewAppName] = useState('')
    const [newExecutablePath, setNewExecutablePath] = useState('')
    const [newContainer, setNewContainer] = useState('')
    const [newAwsBatchOpts, setNewAwsBatchOpts] = useState<ComputeResourceAwsBatchOpts | undefined>(undefined)
    const [newSlurmOpts, setNewSlurmOpts] = useState<ComputeResourceSlurmOpts | undefined>(undefined)

    const [newAwsBatchOptsValid, setNewAwsBatchOptsValid] = useState(false)
    const [newSlurmOptsValid, setNewSlurmOptsValid] = useState(false)
    
    const isValidAppName = useMemo(() => ((appName: string) => {
        if (!appName) return false
        return !computeResource.apps.find(a => a.name === appName)
    }), [computeResource])

    const isValid = useMemo(() => {
        if (!isValidAppName(newAppName)) return false
        if (!isValidExecutablePath(newExecutablePath)) return false
        if (!newAwsBatchOptsValid) return false
        if (!newSlurmOptsValid) return false
        if (newAwsBatchOpts && newSlurmOpts) return false
        return true
    }, [newAppName, newExecutablePath, newAwsBatchOpts, newSlurmOpts, isValidAppName, newAwsBatchOptsValid, newSlurmOptsValid])

    return (
        <div>
            <h3>Add a new app</h3>
            <hr />
            {/* Input field for the app name */}
            <div>
                <label htmlFor="new-app-name">App name:</label>
                &nbsp;
                <input type="text" id="new-app-name" value={newAppName} onChange={e => setNewAppName(e.target.value)} />
                {/* Indicator on whether the app name is valid */}
                &nbsp;&nbsp;
                {
                    isValidAppName(newAppName) ? (
                        <span style={{color: 'green'}}>
                            {/* Checkmark character */}
                            &#10004;
                        </span>
                    ) : (
                        <span style={{color: 'red'}}>
                            {/* Cross character */}
                            &#10008;
                        </span>
                    )
                }
            </div>
            <br />
            {/* Input field for the executable path */}
            <div>
                <label htmlFor="new-executable-path">Executable path:</label>
                &nbsp;
                <input type="text" id="new-executable-path" value={newExecutablePath} onChange={e => setNewExecutablePath(e.target.value)} />
            </div>
            <br />
            {/* Input field for the container */}
            <div>
                <label htmlFor="new-container">Container:</label>
                &nbsp;
                <input type="text" id="new-container" value={newContainer} onChange={e => setNewContainer(e.target.value)} />
            </div>
            <br />
            <hr />
            <EditAwsBatchOpts
                value={newAwsBatchOpts}
                onChange={setNewAwsBatchOpts}
                setValid={setNewAwsBatchOptsValid}
            />
            <br />
            <hr />
            <EditSlurmOpts
                value={newSlurmOpts}
                onChange={setNewSlurmOpts}
                setValid={setNewSlurmOptsValid}
            />
            <br />
            <hr />
            {/* Indicator on whether the app is valid */}
            {
                isValid ? (
                    <span style={{color: 'green'}}>
                        {/* Checkmark character */}
                        &#10004;
                    </span>
                ) : (
                    <span style={{color: 'red'}}>
                        {/* Cross character */}
                        &#10008;
                    </span>
                )
            }
            <hr />
            {/* Button to create the app */}
            <button disabled={!isValid} onClick={() => onNewApp(newAppName, newExecutablePath, newContainer, newAwsBatchOpts, newSlurmOpts)}>Add app</button>
        </div>
    )
}

const isValidExecutablePath = (executablePath: string) => {
    if (!executablePath) return false
    // check if it's a valid absolute linux path using a regular expression
    const absoluteLinuxPathRegex = /^\/([\w-./ ]+)?$/
    if (!executablePath.match(absoluteLinuxPathRegex)) return false
    return true
}

type EditAwsBatchOptsProps = {
    value: ComputeResourceAwsBatchOpts | undefined
    onChange: (value: ComputeResourceAwsBatchOpts | undefined) => void
    setValid: (valid: boolean) => void
}

const EditAwsBatchOpts: FunctionComponent<EditAwsBatchOptsProps> = ({value, onChange, setValid}) => {
    const [internalJobQueue, setInternalJobQueue] = useState('')
    const [internalJobDefinition, setInternalJobDefinition] = useState('')

    useEffect(() => {
        if (!value) {
            setInternalJobQueue('')
            setInternalJobDefinition('')
            return
        }
        setInternalJobQueue(value.jobQueue)
        setInternalJobDefinition(value.jobDefinition)
    }, [value])

    useEffect(() => {
        if (!internalJobQueue && !internalJobDefinition) {
            onChange(undefined)
            setValid(true)
            return
        }
        if (!internalJobQueue || !internalJobDefinition) {
            setValid(false)
            return
        }
        onChange({
            jobQueue: internalJobQueue,
            jobDefinition: internalJobDefinition
        })
        setValid(true)
    }, [internalJobQueue, internalJobDefinition, onChange, setValid])

    return (
        <div>
            <h4>AWS Batch</h4>
            {/* Input field for the job queue */}
            <div>
                <label htmlFor="new-aws-batch-job-queue">Job queue:</label>
                &nbsp;
                <input type="text" id="new-aws-batch-job-queue" value={internalJobQueue} onChange={e => setInternalJobQueue(e.target.value)} />
            </div>
            <br />
            {/* Input field for the job definition */}
            <div>
                <label htmlFor="new-aws-batch-job-definition">Job definition:</label>
                &nbsp;
                <input type="text" id="new-aws-batch-job-definition" value={internalJobDefinition} onChange={e => setInternalJobDefinition(e.target.value)} />
            </div>
        </div>
    )
}

type EditSlurmOptsProps = {
    value: ComputeResourceSlurmOpts | undefined
    onChange: (value: ComputeResourceSlurmOpts | undefined) => void
    setValid: (valid: boolean) => void
}

const EditSlurmOpts: FunctionComponent<EditSlurmOptsProps> = ({value, onChange, setValid}) => {
    const [internalCpusPerTask, setInternalCpusPerTask] = useState('')
    const [internalPartition, setInternalPartition] = useState('')
    const [internalTime, setInternalTime] = useState('')
    const [internalOtherOpts, setInternalOtherOpts] = useState('')

    useEffect(() => {
        if (!value) {
            setInternalCpusPerTask('')
            setInternalPartition('')
            setInternalTime('')
            setInternalOtherOpts('')
            return
        }
        setInternalCpusPerTask(value.cpusPerTask !== undefined ? value.cpusPerTask + '' : '')
        setInternalPartition(value.partition || '')
        setInternalTime(value.time || '')
        setInternalOtherOpts(value.otherOpts || '')
    }, [value])

    useEffect(() => {
        if (!internalCpusPerTask && !internalPartition && !internalTime && !internalOtherOpts) {
            onChange(undefined)
            setValid(true)
            return
        }
        if (!internalCpusPerTask || !internalPartition || !internalTime || !internalOtherOpts) {
            setValid(false)
            return
        }
        if ((internalCpusPerTask) && (!isValidInteger(internalCpusPerTask))) {
            setValid(false)
            return
        }
        onChange({
            cpusPerTask: internalCpusPerTask ? parseInt(internalCpusPerTask) : undefined,
            partition: internalPartition || undefined,
            time: internalTime || undefined,
            otherOpts: internalOtherOpts || undefined
        })
        setValid(true)
    }, [internalCpusPerTask, internalPartition, internalTime, internalOtherOpts, onChange, setValid])

    return (
        <div>
            <h4>Slurm</h4>
            {/* Input field for the CPUs per task */}
            <div>
                <label htmlFor="new-slurm-cpus-per-task">CPUs per task:</label>
                &nbsp;
                <input type="text" id="new-slurm-cpus-per-task" value={internalCpusPerTask} onChange={e => setInternalCpusPerTask(e.target.value)} />
            </div>
            <br />
            {/* Input field for the partition */}
            <div>
                <label htmlFor="new-slurm-partition">Partition:</label>
                &nbsp;
                <input type="text" id="new-slurm-partition" value={internalPartition} onChange={e => setInternalPartition(e.target.value)} />
            </div>
            <br />
            {/* Input field for the time */}
            <div>
                <label htmlFor="new-slurm-time">Time:</label>
                &nbsp;
                <input type="text" id="new-slurm-time" value={internalTime} onChange={e => setInternalTime(e.target.value)} />
            </div>
            <br />
            {/* Input field for the other options */}
            <div>
                <label htmlFor="new-slurm-other-opts">Other options:</label>
                &nbsp;
                <input type="text" id="new-slurm-other-opts" value={internalOtherOpts} onChange={e => setInternalOtherOpts(e.target.value)} />
            </div>
        </div>
    )
}

const isValidInteger = (value: string) => {
    const regex = /^\d+$/
    return value.match(regex)
}

export default NewAppWindow