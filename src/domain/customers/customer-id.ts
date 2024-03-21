import { v4 as uuidv4 } from 'uuid';
import { UserType } from '../core/user-type';

export type CustomerId = {
    type: UserType.Customer;
    value: string;
};

export function newCustomerId(): CustomerId {
    return { type: UserType.Customer, value: uuidv4() }
}