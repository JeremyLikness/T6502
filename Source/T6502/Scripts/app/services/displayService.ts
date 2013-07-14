///<reference path="../globalConstants.ts"/>
///<reference path="../app.ts"/>

module Services {
    
    export interface IDisplayService {
        pixels: number[];
        draw(address: number, value: number): void;
        callback: (address: number, value: number) => void;
    }

    export class DisplayService implements IDisplayService {
    
        public pixels: number[];
        public callback: (address: number, value: number) => void;

        constructor() {
            this.pixels = new Array(Constants.Display.Size);
            this.callback = null;
        }

        public draw(address: number, value: number) {
            var target: number = address & Constants.Display.Max; 
            this.pixels[target] = value & Constants.Memory.ByteMask;

            if (this.callback !== null) {
                this.callback(address, value);
            }
        }
    }

    Main.App.Services.service("displayService", DisplayService);
}