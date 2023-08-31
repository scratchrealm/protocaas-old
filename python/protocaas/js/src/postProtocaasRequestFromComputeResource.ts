import { signMessage } from "./signatures";
import { isProtocaasResponse, ProtocaasRequest, ProtocaasRequestPayload, ProtocaasResponse } from "./types/ProtocaasRequest";

const postProtocaasRequestFromComputeResource = async (req: ProtocaasRequestPayload, o: {computeResourceId: string, computeResourcePrivateKey: string}): Promise<ProtocaasResponse | undefined> => {
    const rr: ProtocaasRequest = {
        payload: req,
        fromClientId: o.computeResourceId,
        signature: await signMessage(req, o.computeResourceId, o.computeResourcePrivateKey)
    }

    const protocaasUrl = process.env.PROTOCAAS_URL || 'https://protocaas.vercel.app'
    // const protocaasUrl = process.env.PROTOCAAS_URL || 'http://localhost:3000'

    try {
        const resp = await fetch(`${protocaasUrl}/api/protocaas`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(rr),
        })
        const responseText = await resp.text()
        let responseData: any
        try {
            responseData = JSON.parse(responseText)
        }
        catch (err) {
            console.warn(responseText)
            throw Error('Unable to parse protocaas response')
        }
        if (!isProtocaasResponse(responseData)) {
            console.warn(JSON.stringify(responseData, null, 2))
            throw Error('Unexpected protocaas response')
        }
        return responseData
    }
    catch (err) {
        console.warn(err)
        console.info(`Unable to post protocaas request: ${err.message}`)
        return undefined
    }
}

export default postProtocaasRequestFromComputeResource