// Database TLS, as in Kotahi: off by default.
// POSTGRES_ALLOW_SELF_SIGNED_CERTIFICATES=true turns it on without checking the
// certificate; POSTGRES_CA_CERT (base64) turns it on and checks the certificate
// against that CA, overriding the former.
export const getPostgresSsl = () => {
  const caCert = process.env.POSTGRES_CA_CERT

  if (caCert) return { ca: Buffer.from(caCert, 'base64').toString('utf-8') }

  if (process.env.POSTGRES_ALLOW_SELF_SIGNED_CERTIFICATES === 'true')
    return { rejectUnauthorized: false }

  return false
}
