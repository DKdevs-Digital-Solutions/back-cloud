import Fastify from 'fastify'
import fetch from 'node-fetch'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

const app = Fastify({ logger: true })

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
})

app.post('/upload-from-url', async (req, reply) => {
  try {
    const { blobUrl } = req.body

    if (!blobUrl) {
      return reply.code(400).send({ error: 'blobUrl é obrigatório' })
    }

    const response = await fetch(blobUrl)

    if (!response.ok) {
      throw new Error('Falha ao baixar arquivo')
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const buffer = Buffer.from(await response.arrayBuffer())

    const fileKey = `${uuidv4()}`

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType
    }))

    const fileUrl = `${process.env.PUBLIC_URL}/${fileKey}`

    return { url: fileUrl }

  } catch (err) {
    req.log.error(err)
    return reply.code(500).send({ error: err.message })
  }
})

app.listen({ port: 3000, host: '0.0.0.0' })