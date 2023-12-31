import { ProtocaasWorkspace } from "../src/types/protocaas-types"

const getWorkspaceRole = (workspace: ProtocaasWorkspace, userId: string | undefined): 'none' | 'viewer' | 'editor' | 'admin' => {
    if (userId?.startsWith('admin|')) {
        return 'admin'
    }
    if (userId) {
        if (workspace.ownerId === userId) {
            return 'admin'
        }
        const user = workspace.users.find(x => x.userId === userId)
        if (user) {
            return user.role
        }
    }
    if (workspace.publiclyReadable) {
        return 'viewer'
    }
    else {
        return 'none'
    }
}

export default getWorkspaceRole