import { Notifiable } from "../notifications/notifiable.js";

export abstract class BaseEntity extends Notifiable {
    /*O '!' INDICA PARA O TYPESCRIPT QUE O "id" NÃO EXISTE NA CRIAÇÃO, MAS EXISTIRÁ POSTERIORMENTE. UMA INSTRUÇÃO PARA O TYPESCRIPT PARAR DE RECLAMAR NA INTANCIAÇÃO*/
    id!: number;
}