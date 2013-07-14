///<reference path='cpu.ts'/>
module Emulator {

    export interface IDecompileInfo {
        opName: string;
        sizeBytes: number; 
        decompile(address: number, bytes: number[]): string;
    }

    export interface ICompiler {
        compile(source: string): void;
        decompile(startAddress: number): string;
    }

    export class Compiler implements ICompiler {
    
        private cpu: Emulator.ICpu;
        private consoleService: Services.ConsoleService;

        constructor(
            cpu: Emulator.ICpu, 
            consoleService: Services.ConsoleService) {
            this.cpu = cpu;
            this.consoleService = consoleService;
        }

        public decompile(startAddress: number) {
            
            var address: number = startAddress & Constants.Memory.Max;
            var instructions: number = 0;
            var lines: string[] = [];

            while (instructions < 50 && address <= Constants.Memory.Max) {
            
                var opCode: number = this.cpu.peek(address);

                var parms = [
                    opCode,
                    this.cpu.peek(address + 1), 
                    this.cpu.peek(address + 2)
                ];

                var operation: IDecompileInfo = this.cpu.getOperation(opCode);
                lines.push(operation.decompile(address, parms));

                instructions += 1;
                address += operation.sizeBytes;
            }

            return lines.join("\r\n");
        }

        public compile(source: string): void {  
            this.consoleService.log("Starting compilation.");          
            var start: number = 0xC000;
            var lines: string[] = source.split('\n'); 
            var labels = this.parseLabels(lines);
        }   
        
        private parseLabels(lines: string[]): any[] {
            var memoryLabel: RegExp = /^(\$\w+):.*/;
            var regularLabel: RegExp = /^(\w+):.*/;
            var labels: any[] = [];
            var memoryLabels: number = 0;
            var actualLabels: number = 0;
            var idx: number;
            for (idx = 0; idx < lines.length; idx++) {
                var input = lines[idx];
                if(input.match(memoryLabel)) {
                    memoryLabels++;
                }
                else {
                    if (input.match(regularLabel)) {
                        var label: string = regularLabel.exec(input)[1];
                        actualLabels++;
                    }    
                }        
            }
            this.consoleService.log("Parsed " + memoryLabels + " memory tags and " + actualLabels + " labels.");
            return labels;
        }     
    }
}