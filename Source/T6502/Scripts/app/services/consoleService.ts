///<reference path="../app.ts"/>

module Services {
    
    export interface IConsoleService {
        lines: string[];
        log(message: string);
    }

    export class ConsoleService implements IConsoleService {
    
        public lines: string[];

        constructor() {
            this.lines = [];
        }

        public log(message: string) {
            this.lines.push(message);
        }

    }

    Main.App.Services.service("consoleService", ConsoleService);
}