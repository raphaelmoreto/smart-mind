import { Module } from '@nestjs/common';

//MÓDULO RESPONSÁVEL POR TRABALHAR COM CONFIGURAÇÕES DA APLICAÇÃO
import { ConfigModule } from '@nestjs/config'; 

//MÓDULO RESPONSÁVEL PELA FUNCIONALIDADE DE USUÁRIOS
import { UsuarioModule } from './modules/usuario/usuario.module.js';

/*
• @Module({}) - É UM DECORATOR QUE TRANSFORMA UM MÓDULO RECONHECIDO PELO NESTJS; 

• imports: [] - MOSTRA QUAIS OUTROS MÓDULOS ESSE MÓDULO PRECISA UTILIZAR;
• controllers: [] - INDICA QUAIS CONTROLLERS PERTENCEM A ESTE MÓDULO;
• providers: [] - SÃO CLASSES QUE O NEST PODE GERENCIAR ATRAVÉS DO DEPENDENCY INJECTION;
• exports: [] - INDICA QUAIS PROVIDERS DO MÓDULO QUERO DISPONIBILIZAR PARA OUTROS MÓDULOS;

• forRoot() - É UMA FORMA DE INICIALIZAR/CONFIGURAR O MÓDULO;
• isGlobal: true - FAZ COM QUE O "ConfigModule" FICA DISPONÍVEL GLOBALMENTE NA APLICAÇÃO;
*/

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        UsuarioModule
    ],
    controllers: [],
    providers: [],
})
export class AppModule {}
