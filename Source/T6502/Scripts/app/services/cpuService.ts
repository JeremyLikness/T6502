///<reference path="../app.ts"/>
///<reference path="../emulator/cpu.ts"/>
///<reference path="../emulator/compiler.ts"/>

module Services {
    
    export interface ICpuService {
        getCpu(): Emulator.ICpu;    
        getCompiler(): Emulator.ICompiler;    
    }

    export class CpuService implements ICpuService {
    
        public $injector = ['$timeout', 'consoleService', 'displayService'];

        private cpu: Emulator.ICpu;
        private compiler: Emulator.ICompiler; 

        constructor(
            $timeout,
            consoleService: Services.ConsoleService,
            displayService: Services.DisplayService) {
                this.cpu = new Emulator.Cpu(consoleService, displayService, $timeout);
                this.compiler = new Emulator.Compiler(this.cpu, consoleService);
        }

        public getCpu(): Emulator.ICpu {
            return this.cpu;
        }

        public getCompiler(): Emulator.ICompiler {
            return this.compiler;
        }
    }

    Main.App.Services.service("cpuService", ['$timeout', 'consoleService', 'displayService', CpuService]);
}