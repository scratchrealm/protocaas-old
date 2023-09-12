import { FunctionComponent, useCallback, useReducer } from "react"
import { useModalDialog } from "../../ApplicationBar"
import Hyperlink from "../../components/Hyperlink"
import ModalWindow from "../../components/ModalWindow/ModalWindow"
import { ProtocaasComputeResource } from "../../types/protocaas-types"
import { selectedStringsReducer, TableCheckbox } from "../ProjectPage/FileBrowser/FileBrowser2"
import ComputeResourceAppsTableMenuBar from "./ComputeResourceAppsTableMenuBar"
import NewAppWindow from "./NewAppWindow"

type Props = {
    width: number
    height: number
    computeResource: ProtocaasComputeResource
    onNewApp: (name: string, executablePath: string, container: string, absBatch?: {jobQueue: string, jobDefinition: string}) => void
    onDeleteApps: (appNames: string[]) => void
}

const menuBarHeight = 30
const hPadding = 20
const vPadding = 5

const ComputeResourceAppsTable: FunctionComponent<Props> = ({width, height, computeResource, onNewApp, onDeleteApps}) => {
    const [selectedAppNames, selectedAppNamesDispatch] = useReducer(selectedStringsReducer, new Set<string>())

    const {visible: newAppWindowVisible, handleOpen: openNewAppWindow, handleClose: closeNewAppWindow} = useModalDialog()

    const onAppClicked = useCallback((appName: string) => {
        // TODO
    }, [])

    const colWidth = 15

    return (
        <div style={{position: 'relative', width, height}}>
            <div style={{position: 'absolute', width: width - hPadding * 2, height: menuBarHeight - vPadding * 2, paddingLeft: hPadding, paddingRight: hPadding, paddingTop: vPadding, paddingBottom: vPadding}}>
                <ComputeResourceAppsTableMenuBar
                    width={width - hPadding * 2}
                    height={menuBarHeight - vPadding * 2}
                    selectedAppNames={Array.from(selectedAppNames)}
                    onAddApp={openNewAppWindow}
                    onDeleteApps={onDeleteApps}
                />
            </div>
            <div style={{position: 'absolute', width: width - hPadding * 2, height: height - menuBarHeight - vPadding * 2, top: menuBarHeight, overflowY: 'scroll', paddingLeft: hPadding, paddingRight: hPadding, paddingTop: vPadding, paddingBottom: vPadding}}>
                <table className="scientific-table" style={{fontSize: 12}}>
                    <thead>
                        <tr>
                            <th style={{width: colWidth}} />
                            <th>App</th>
                            <th>Executable path</th>
                            <th>Container</th>
                            <th>AWS Batch</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            computeResource.apps.map((app) => (
                                <tr key={app.name}>
                                    <td style={{width: colWidth}}>
                                        <TableCheckbox checked={selectedAppNames.has(app.name)} onClick={() => selectedAppNamesDispatch({type: 'toggle', value: app.name})} />
                                    </td>
                                    <td>
                                        <Hyperlink onClick={() => onAppClicked(app.name)}>
                                            {app.name}
                                        </Hyperlink>
                                    </td>
                                    <td>
                                        {app.executablePath}
                                    </td>
                                    <td>
                                        {app.container || ''}
                                    </td>
                                    <td>
                                        {app.awsBatch ? `Job queue: ${app.awsBatch.jobQueue} | Job definition: ${app.awsBatch.jobDefinition}` : ''}
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
            <ModalWindow
                open={newAppWindowVisible}
                onClose={closeNewAppWindow}
            >
                <NewAppWindow
                    computeResource={computeResource}
                    onNewApp={(name, executablePath, container, awsBatch) => {closeNewAppWindow(); onNewApp(name, executablePath, container, awsBatch);}}
                />
            </ModalWindow>
        </div>
    )
}

export default ComputeResourceAppsTable