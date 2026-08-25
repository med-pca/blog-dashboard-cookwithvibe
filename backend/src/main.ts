import './instrument'

import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { join } from 'path'
import { AppModule } from './app.module'
import { configureApp } from './configure-app'
import { resolveCorsOrigins } from './common/cors-origins'
import { DbLogger } from './logs/db-logger.service'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true, bufferLogs: true })

  // Tüm Logger.error/warn çağrıları veritabanına da yazılır (admin panel → Loglar)
  app.useLogger(app.get(DbLogger))

  configureApp(app)

  const allowedOrigin = process.env.FRONTEND_URL
  if (!allowedOrigin) {
    throw new Error('FRONTEND_URL env variable is not set')
  }
  app.enableCors({
    origin: resolveCorsOrigins(process.env.CORS_ORIGINS, allowedOrigin),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' })

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('CookWithVibe API')
      .setDescription('CookWithVibe backend API dokümantasyonu')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  app.enableShutdownHooks()

  const port = process.env.PORT || 3001
  await app.listen(port)
  new Logger('Bootstrap').log(`Backend running on http://localhost:${port}/api`)
}
bootstrap()
