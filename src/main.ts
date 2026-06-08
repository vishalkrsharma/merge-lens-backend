import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { auth } from '@/core/auth/auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableCors({
    origin: process.env.FRONTEND_URLS?.split(',').map((o) => o.trim()) ?? [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('MergeLens API')
      .setDescription('AI-powered GitHub PR review backend')
      .setVersion('1.0')
      .addCookieAuth('better-auth.session_token')
      .build(),
  );

  const authSchema = await auth.api.generateOpenAPISchema();
  for (const [path, methods] of Object.entries(authSchema.paths ?? {})) {
    for (const operation of Object.values(
      methods as Record<string, { tags?: string[] }>,
    )) {
      if (operation && typeof operation === 'object') operation.tags = ['Auth'];
    }
    (document.paths as Record<string, unknown>)[`/auth${path}`] = methods;
  }
  document.components = {
    ...document.components,
    schemas: {
      ...document.components?.schemas,
      ...(authSchema.components?.schemas as object),
    },
  };
  document.tags = [...(document.tags ?? []), { name: 'Auth' }];

  SwaggerModule.setup('api/swagger-json', app, document, {
    jsonDocumentUrl: 'api/swagger-json/json',
  });

  app.use(
    '/api/docs',
    apiReference({
      sources: [{ url: '/api/swagger-json/json', title: 'MergeLens API' }],
      theme: 'default',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(console.error);
