import { isProtocaasResponse, ProtocaasRequest, ProtocaasRequestPayload, ProtocaasResponse } from "../types/ProtocaasRequest";

const postProtocaasRequest = async (req: ProtocaasRequestPayload, o: {userId?: string, githubAccessToken?: string}): Promise<ProtocaasResponse> => {
    const rr: ProtocaasRequest = {
        payload: req
    }
    if ((o.userId) && (o.githubAccessToken)) {
        rr.githubAccessToken = o.githubAccessToken
        rr.userId = o.userId
    }
    const resp = await fetch('/api/protocaas', {
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
    } catch (e) {
        console.error(responseText)
        throw Error('Problem parsing protocaas response')
    }
    if (!isProtocaasResponse(responseData)) {
        console.warn(JSON.stringify(responseData, null, 2))
        throw Error('Unexpected protocaas response')
    }
    return responseData
}

export default postProtocaasRequest