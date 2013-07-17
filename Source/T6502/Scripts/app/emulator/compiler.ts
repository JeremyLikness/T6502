///<reference path='cpu.ts'/>
///<reference path='opCodes.ts'/>

module Emulator {

    export interface ICompiler {
        compile(source: string): void;
        decompile(startAddress: number): string;
    }

    export interface ILabel {
        address: number;
        labelName: string;
    }

    export interface ICompilerResult {
        startAddress: number;
        opCodes: number[];
    }

    export class Compiler implements ICompiler {
    
        private cpu: Emulator.ICpu;
        private consoleService: Services.ConsoleService;
        private opCodeCache: { [opCodeName: string] : IOperation[] };
        private opCode: RegExp = /^\s+([A-Za-z]{3})\s*(\S*)/;            

        constructor(
            cpu: Emulator.ICpu, 
            consoleService: Services.ConsoleService) {
            this.cpu = cpu;
            this.consoleService = consoleService;
            this.opCodeCache = {};
        }

        public decompile(startAddress: number) {
            
            var address: number = startAddress & Constants.Memory.Max;
            var instructions: number = 0;
            var lines: string[] = [];

            while (instructions < Constants.Memory.MaxInstructionsDecompile && address <= Constants.Memory.Max) {
            
                var opCode: number = this.cpu.peek(address);

                var parms = [
                    opCode,
                    this.cpu.peek(address + 1), 
                    this.cpu.peek(address + 2)
                ];

                var operation = this.cpu.getOperation(opCode);
                lines.push(operation.decompile(address, parms));

                instructions += 1;
                address += operation.sizeBytes;
            }

            return lines.join("\r\n");
        }

        public compile(source: string): void {  
            var lines: string[] = source.split('\n'); 
            
            this.consoleService.log("Starting compilation.");          
            
            try {
                var compilerResult: ICompilerResult = this.compileSource(lines);
                this.consoleService.log("Compilation passes complete; moving buffer into memory at $" +
                    compilerResult.startAddress.toString(16).toUpperCase());
            }
            catch (e) {
                this.consoleService.log(e);
            }
        }
        
        private compileSource(lines: string[]): ICompilerResult {
            
            var compilerResult: ICompilerResult = {
                startAddress: Constants.Memory.DefaultStart,
                opCodes: []
            };

            var address: number = compilerResult.startAddress;
            var addressSet: boolean = false;
            var memoryIgnore: boolean = false;
            var notWhitespace: RegExp = /\S/;
            var whitespaceTrim: RegExp = /^\s+/;
            var whitespaceTrimEnd: RegExp = /\s+$/;
            var comment: RegExp = /^\;.*/;
            var memoryLabel: RegExp = /^(\$\w+):.*/;
            var regularLabel: RegExp = /^(\w+):.*/;
            var labels: ILabel[] = [];
            var label: string;
            var opCodeLabel: string;
            var buffer: number[] = [];
            var memoryLabels: number = 0;
            var actualLabels: number = 0;
            var idx: number;
            
            this.consoleService.log("Starting compilation pass 1.");          
            
            for (idx = 0; idx < lines.length; idx++) {
                
                var input = lines[idx];
                
                // only whitespace
                if (!notWhitespace.test(input)) {
                    continue;
                }

                // comment 
                if (comment.test(input)) {
                    continue;
                }
                
                // trim the line 
                input = input.replace(whitespaceTrim, "").replace(whitespaceTrimEnd, "");

                if(input.match(memoryLabel)) {
                    memoryLabels++;                    
                    
                    label = memoryLabel.exec(input)[1];
                    
                    // strip the label out 
                    input = input.replace(label + ":", "");

                    if (!addressSet) {
                        addressSet = true; 
                        label = label.replace("$", "");
                        compilerResult.startAddress = parseInt(label, 16);
                    } else {
                        memoryIgnore = true;
                    }                    
                }
                else {
                    if (input.match(regularLabel)) {
                        label = regularLabel.exec(input)[1].toUpperCase();
                        if (this.labelExists(label, labels)) {
                            throw "Duplicate label " + label + " found at line " + (idx+1);
                        }
                        labels.push({
                            address: address,
                            labelName: label
                        });
                        actualLabels++;
                        input = input.replace(label + ":", "");
                    }    
                }

                // ignore comments
                if (input.match(comment)) {
                    continue;
                }

                // skip whitespace only
                if (!input.match(notWhitespace)) {
                    continue;
                }

                // check for op code 
                if (input.match(this.opCode)) {
                    try {
                       var instructions: number[] = this.parseOpCode(input);
                    }
                    catch (e) {
                        throw e + " (Line " + (idx + 1) + ").";
                    }
                }
                else {
                    throw "Invalid assembly line " + (idx + 1) + ": " + lines[idx] + ".";
                }
            }
        
            if (memoryIgnore) {
                this.consoleService.log("Compilation address may only be set once. Some memory labels were ignored.");
            }
            this.consoleService.log("Parsed " + memoryLabels + " memory tags and " + actualLabels + " labels.");            
        
            return compilerResult;
        }

        private parseOpCode(opCodeExpression: string): number[] {
            var returnValue: number[] = [];
            var matches: RegExpExecArray = this.opCode.exec(opCodeExpression);
            
            var opCodeName: string = matches[1].toUpperCase();
            var operations: IOperation[] = [];

            if (opCodeName in this.opCodeCache) {
                operations = this.opCodeCache[opCodeName];
            }
            else {
                operations = OpCodes.LoadOpCodesByName(opCodeName);
                if (operations.length > 0) {
                    this.opCodeCache[opCodeName] = operations;
                }
                else {
                    throw "Invalid op code: " + opCodeName; 
                }
            }

            return returnValue;
        }

        private labelExists(label: string, labels: ILabel[]): bool {
            var idx: number; 
            for (idx = 0; idx < labels.length; idx++) {
                if (labels[idx].labelName === label) {
                    return true;
                }
            }
            return false;
        }     
    }
}