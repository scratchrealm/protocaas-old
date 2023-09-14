const createRandomId = (numChars: number) => {
    // lowercase letters and digits
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = ''
    for (let i = 0; i < numChars; i++) {
        id += chars[Math.floor(Math.random() * chars.length)]
    }
    return id
}

export default createRandomId