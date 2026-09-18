import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true
        })
    );

    const config = new DocumentBuilder()
        .setTitle("SmartMind-API")
        .setDescription("Painel inteligente que aprende a rotina dos moradores e sugere ajustes de conforto/energia")
        .setVersion("1.0")
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup("api", app, document);

    await app.listen(process.env.PORT ?? 3000);

    const url = await app.getUrl();
    console.log(`Servidor rodando em: ${url}`);
    //CASO APAREÇA NO TERMINAL: "http://[::1]:3000" COLOCAR NO NAVEGADOR "http://localhost:3000/api"
}
await bootstrap();