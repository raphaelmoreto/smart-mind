export interface IInsert<T extends object> {
    insert(entity: T): Promise<boolean>;
}