import { Notification } from "./notification.js";

export abstract class Notifiable {
    protected notifications: Notification[] = [];

    protected addNotification(atributo: string, mensagem: string): void {
        this.notifications.push( new Notification(atributo.toUpperCase(), mensagem.toUpperCase()) );
    }

    protected clearNotificarions(): void {
        this.notifications = [];
    }

    public get isValid(): boolean {
        return this.notifications.length === 0;
    }

    public get notificationsList(): Notification[] {
        return this.notifications;
    }
}