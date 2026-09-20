import { Notifiable } from "../notifications/notifiable.js";
import { PrimaryGeneratedColumn } from "typeorm";

export abstract class BaseEntity extends Notifiable {
    /*O '!' INDICA PARA O TYPESCRIPT QUE O "id" NÃO EXISTE NA CRIAÇÃO, MAS EXISTIRÁ POSTERIORMENTE. UMA INSTRUÇÃO PARA O TYPESCRIPT PARAR DE RECLAMAR NA INTANCIAÇÃO*/
    @PrimaryGeneratedColumn()
    protected id!: number;

    protected setId(id: number): void {
        if (id <= 0) {
            this.addNotification("id", "id não pode ser nulo/vázio");
            return;
        }

        if (id === this.id)
            return;

        this.id = id;
    }

    public getId(): number { return this.id; }
}