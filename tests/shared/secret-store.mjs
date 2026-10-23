export function createTestSecretStore() {
  return {
    encrypt(value) {
      return `safeStorage:v1:${Buffer.from(value, 'utf8').toString('base64')}`
    },
    decrypt(value) {
      return Buffer.from(String(value).replace(/^safeStorage:v1:/, ''), 'base64').toString('utf8')
    }
  }
}
