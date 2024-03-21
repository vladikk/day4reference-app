import { SupportCase } from '../domain/support-cases/support-case';
import { SupportCase as SupportCaseES } from '../domain/support-cases-es/support-case';

import { IWorldOptions, World, setWorldConstructor } from '@cucumber/cucumber'

export interface ICustomWorld extends World {
	supportCase?: SupportCase
	supportCaseES?: SupportCaseES
	now: Date
    sharedData: { [key: string]: any };
}

export class CustomWorld extends World implements ICustomWorld {
	constructor(options: IWorldOptions) {
		super(options)
	}

	now: Date = new Date();
    sharedData: { [key: string]: any } = {};
}

setWorldConstructor(CustomWorld)