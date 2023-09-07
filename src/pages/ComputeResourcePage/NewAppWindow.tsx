import { FunctionComponent, useMemo, useState } from "react"
import { ProtocaasComputeResource } from "../../types/protocaas-types"

type Props = {
    computeResource: ProtocaasComputeResource
    onNewApp: (name: string, executablePath: string, container: string) => void
}

const NewAppWindow: FunctionComponent<Props> = ({computeResource, onNewApp}) => {
    const [newAppName, setNewAppName] = useState('')
    const [newExecutablePath, setNewExecutablePath] = useState('')
    const [newContainer, setNewContainer] = useState('')
    const isValidAppName = useMemo(() => ((appName: string) => {
        if (!appName) return false
        return !computeResource.apps.find(a => a.name === appName)
    }), [computeResource])

    const isValid = useMemo(() => {
        if (!isValidAppName(newAppName)) return false
        if (!isValidExecutablePath(newExecutablePath)) return false
        return true
    }, [isValidAppName, newAppName, newExecutablePath])

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
            <hr />
            {/* Button to create the app */}
            <button disabled={!isValid} onClick={() => onNewApp(newAppName, newExecutablePath, newContainer)}>Add app</button>
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