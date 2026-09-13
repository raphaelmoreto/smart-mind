export interface IUpdate<T extends object> {
    update(entity: T): Promise<boolean>;
}