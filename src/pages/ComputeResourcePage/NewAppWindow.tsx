import { FunctionComponent, useMemo, useState } from "react"
import { ProtocaasComputeResource } from "../../types/protocaas-types"

type Props = {
    computeResource: ProtocaasComputeResource
    onNewApp: (name: string, executablePath: string, container: string, awsBatch?: {jobQueue: string, jobDefinition: string}, slurmOpts?: string) => void
}

const NewAppWindow: FunctionComponent<Props> = ({computeResource, onNewApp}) => {
    const [newAppName, setNewAppName] = useState('')
    const [newExecutablePath, setNewExecutablePath] = useState('')
    const [newContainer, setNewContainer] = useState('')
    const [newAwsBatchJobQueue, setNewAwsBatchJobQueue] = useState('')
    const [newAwsBatchJobDefinitiion, setNewAwsBatchJobDefinition] = useState('')
    const [newSlurmOpts, setNewSlurmOpts] = useState('')
    
    const isValidAppName = useMemo(() => ((appName: string) => {
        if (!appName) return false
        return !computeResource.apps.find(a => a.name === appName)
    }), [computeResource])

    const isValid = useMemo(() => {
        if (!isValidAppName(newAppName)) return false
        if (!isValidExecutablePath(newExecutablePath)) return false
        if (newAwsBatchJobQueue && !newAwsBatchJobDefinitiion) return false
        if (!newAwsBatchJobQueue && newAwsBatchJobDefinitiion) return false
        if (newAwsBatchJobDefinitiion && newSlurmOpts) return false
        return true
    }, [isValidAppName, newAppName, newExecutablePath, newAwsBatchJobQueue, newAwsBatchJobDefinitiion, newSlurmOpts])

    const newBatch = useMemo(() => {
        if (newAwsBatchJobQueue && newAwsBatchJobDefinitiion) return {jobQueue: newAwsBatchJobQueue, jobDefinition: newAwsBatchJobDefinitiion}
        else return undefined
    }, [newAwsBatchJobQueue, newAwsBatchJobDefinitiion])

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
            {/* Input field for the aws batch job queue */}
            <div>
                <label htmlFor="new-aws-batch-job-queue">AWS Batch job queue:</label>
                &nbsp;
                <input type="text" id="new-aws-batch-job-queue" value={newAwsBatchJobQueue} onChange={e => setNewAwsBatchJobQueue(e.target.value)} />
            </div>
            <br />
            {/* Input field for the aws batch job definition */}
            <div>
                <label htmlFor="new-aws-batch-job-definition">AWS Batch job definition:</label>
                &nbsp;
                <input type="text" id="new-aws-batch-job-definition" value={newAwsBatchJobDefinitiion} onChange={e => setNewAwsBatchJobDefinition(e.target.value)} />
            </div>
            {/* Input field for the slurm options */}
            <div>
                <label htmlFor="new-slurm-opts">Slurm options:</label>
                &nbsp;
                <input type="text" id="new-slurm-opts" value={newSlurmOpts} onChange={e => setNewSlurmOpts(e.target.value)} />
            </div>
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
            <button disabled={!isValid} onClick={() => onNewApp(newAppName, newExecutablePath, newContainer, newBatch, newSlurmOpts)}>Add app</button>
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

export default NewAppWindow