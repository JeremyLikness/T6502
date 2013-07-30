///<reference path="../app.ts"/>
///<reference path="../globalConstants.ts"/>

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

            if (this.lines.length > Constants.Display.ConsoleLines) {
                this.lines.splice(0, 1);
            }
            
        }

    }

    Main.App.Services.service("consoleService", ConsoleService);
}