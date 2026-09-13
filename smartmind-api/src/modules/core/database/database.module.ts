import { Module } from "@nestjs/common";

//"ConfigService" É UM SERVIÇO QUE PERMITE LER CONFIGURAÇÕES
import { ConfigModule, ConfigService } from "@nestjs/config";

//"Pool" É UM OBJETO QUE GERENCIA UM "pool" DE CONEXÕES COM O BANCO
import { Pool } from "pg";

import { DATABASE_POOL } from "./database.constants.js";

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: DATABASE_POOL,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                //CRIANDO A CONEXÃO ("pool") DO BANCO POSTGRESQL
                return new Pool({
                    host: configService.getOrThrow<string>('DB_HOST'),
                    port: Number(configService.getOrThrow<number>('DB_PORT')),
                    user: configService.getOrThrow<string>('DB_USER'),
                    password: configService.getOrThrow<string>('DB_PASSWORD'),
                    database: configService.getOrThrow<string>('DB_NAME'),
                })
            }
        },
    ],
    exports: [DATABASE_POOL]
})
export class DatabaseModule { }
