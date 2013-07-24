///<reference path='cpu.ts'/>
///<reference path='opCodes.ts'/>

module Emulator {

    export interface ICompiler {
        compile(source: string): bool;
        decompile(startAddress: number): string;
    }

    export interface ILabel {
        address: number;
        labelName: string;
    }

    export interface ICompiledLine {
        address: number;
        code: number[];
        processed: boolean;
        label: string;
    }

    export interface ICompilerResult {
        labels: ILabel[];
        compiledLines: ICompiledLine[];
    }

    export class Compiler implements ICompiler {
    
        private pcAddress: number;
        private cpu: Emulator.ICpuExtended;
        private consoleService: Services.ConsoleService;
        private opCodeCache: { [opCodeName: string] : IOperation[] };
        private opCode: RegExp = /^\s*([A-Z]{3})\s*\S*/;            
        private notWhitespace: RegExp = /\S/;
        private whitespaceTrim: RegExp = /^\s+/;
        private whitespaceTrimEnd: RegExp = /\s+$/;
        private comment: RegExp = /^\;.*/;
        private memoryLabelHex: RegExp = /^(\$[0-9A-F]+):.*/;
        private memoryLabelDec: RegExp = /^([0-9]+):.*/;
        private regularLabel: RegExp = /^(\w+):.*/;
        private memorySet: RegExp = /^\*[\s]*=[\s]*[\$]?[0-9a-f]*$/;
        private setAddress: RegExp = /^[\s]*\*[\s]*=[\s]*/;
        private removeHex: RegExp = /^\$/;
        private immediateHex: RegExp = /^\#\$([0-9A-F]{1,2})\s*/;
        private immediateDec: RegExp = /^\#(\d{1,3})\s*/;
            
        constructor(
            cpu: Emulator.ICpuExtended, 
            consoleService: Services.ConsoleService) {
            this.cpu = cpu;
            this.consoleService = consoleService;
            this.opCodeCache = {};
        }

        public decompile(startAddress: number): string {
            
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

        public compile(source: string): boolean {  
            
            var lines: string[] = source.split('\n'); 
            this.pcAddress = this.cpu.rPC;
            
            this.consoleService.log("Starting compilation.");          
            
            try {
                var compiled: ICompilerResult = this.parseLabels(lines);
                compiled = this.compileSource(compiled);
                this.consoleService.log("Compilation complete.");
                var idx: number;
                var offset: number;
                for (idx = 0; idx < compiled.compiledLines.length; idx++) {
                    var compiledLine: ICompiledLine = compiled.compiledLines[idx];
                    for (offset = 0; offset < compiledLine.code.length; offset++) {
                        this.cpu.poke(compiledLine.address + offset, compiledLine.code[offset]);
                    }
                }
                this.consoleService.log("Code loaded to memory.");
                this.cpu.rPC = this.pcAddress;

            }
            catch (e) {
                this.consoleService.log(e);
                return false;
            }

            return true;
        }
        
        private parseLabels(lines: string[]): ICompilerResult {
            
            var address: number = Constants.Memory.DefaultStart;
            var label: string;
            var opCodeLabel: string;
            var buffer: number[] = [];
            var memoryLabels: number = 0;
            var actualLabels: number = 0;
            var idx: number;
            var parameter: string;

            var result: ICompilerResult = {
                labels: [],
                compiledLines: []
            };

            this.consoleService.log("Starting compilation pass 1.");          
            
            for (idx = 0; idx < lines.length; idx++) {
                
                var input = lines[idx].toUpperCase();
                
                input = this.trimLine(input);

                if(!input.match(this.notWhitespace)) {
                    continue;
                }

                var testAddress: number = this.moveAddress(input);

                if (!(isNaN(testAddress))) {
                    this.pcAddress = testAddress;
                    address = testAddress;
                    continue;
                }

                if(input.match(this.memoryLabelHex) || input.match(this.memoryLabelDec)) {
                    
                    memoryLabels++;                    
                    var hex = input.match(this.memoryLabelHex);
                    label = hex ? this.memoryLabelHex.exec(input)[1] : this.memoryLabelDec.exec(input)[1];
                    
                    // strip the label out 
                    input = input.replace(label + ":", "");

                    // strip hex out if applicable
                    label = label.replace(this.removeHex, "");
                    address = parseInt(label, hex ? 16 : 10);                                        
                }
                else {
                    if (input.match(this.regularLabel)) {
                        label = this.regularLabel.exec(input)[1];
                        if (this.labelExists(label, result.labels)) {
                            throw "Duplicate label " + label + " found at line " + (idx+1);
                        }
                        result.labels.push({
                            address: address,
                            labelName: label
                        });
                        actualLabels++;
                        input = input.replace(label + ":", "");
                    }    
                }

                // skip whitespace only
                if (!input.match(this.notWhitespace)) {
                    continue;
                }

                // check for op code 
                try {                
                    var compiledLine: ICompiledLine = this.compileLine(result.labels, address, input);
                    result.compiledLines.push(compiledLine);
                    address += compiledLine.code.length;
                }
                catch(e) {
                    throw e + " Line: " + (idx + 1);
                }                                
            }
        
            this.consoleService.log("Parsed " + memoryLabels + " memory tags and " + actualLabels + " labels.");            
        
            return result;
        }

        private compileLine(labels: ILabel[], address: number, input: string): ICompiledLine {
            
            var result: ICompiledLine = {
                address: address,
                code: [],
                processed: false,
                label: ""
            };

            if (input.match(this.opCode)) {
                result = this.parseOpCode(labels, input, result);
            }
            else {
                throw "Invalid assembly " + input;
            }
            
            return result;
        }

        private compileSource(compilerResult: ICompilerResult): ICompilerResult {

            this.consoleService.log("Starting compilation pass 2.");

            var idx: number;

            for (idx = 0; idx < compilerResult.compiledLines.length; idx ++) {
                var compiledLine = compilerResult.compiledLines[idx];
                if (!compiledLine.processed) {
                    throw "Not implemented";
                }
            }

            return compilerResult;
        }

        private trimLine(input: string): string {

            // only whitespace
            if (!this.notWhitespace.test(input)) {
                return "";
            }

            // comment 
            if (this.comment.test(input)) {
               return "";
            }
                
            // trim the line 
            input = input.replace(this.whitespaceTrim, "").replace(this.whitespaceTrimEnd, "");

            return input;
        }

        private moveAddress(input: string): number {  
        
            var parameter: string;
            var address: number = NaN;

            if (input.match(this.memorySet)) {
                parameter = input.replace(this.setAddress, "");
                if(parameter[0] === "$" ) {
                    parameter = parameter.replace(this.removeHex, "");
                    address = parseInt(parameter, 16);
                } 
                else {
                    address = parseInt(parameter, 10);
                }
                
                if((address < 0) || (address > Constants.Memory.Max)) {
                    throw "Address out of range";
                }
            }
            
            return address;        
        }

        private getOperationForMode(operations: IOperation[], addressMode: number) {
            var idx: number = 0;
            for (idx = 0; idx < operations.length; idx++) {
                if (operations[idx].addressingMode === addressMode) {
                    return operations[idx];
                }
            }

            return null;
        }

        private parseOpCode(labels: ILabel[], opCodeExpression: string, compiledLine: ICompiledLine): ICompiledLine {
            
            var matches: RegExpExecArray = this.opCode.exec(opCodeExpression);
            var idx: number;

            var opCodeName: string = matches[1];
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

            var parameter: string = this.trimLine(opCodeExpression.replace(opCodeName, ""));

            // single only 
            if (!parameter.match(this.notWhitespace)) {
                var operation: IOperation = this.getOperationForMode(operations, OpCodes.ModeSingle);
                if (operation === null) {
                    throw "Opcode requires a parameter " + opCodeName;
                }
                compiledLine.code.push(operation.opCode);
                compiledLine.processed = true;
                return compiledLine;
            }

            // immediate mode 
            if (parameter.match(this.immediateHex) || parameter.match(this.immediateDec)) {
                var hex: boolean = parameter[1] === "$"; 
                var rawValue: string = parameter.match(hex ? this.immediateHex : this.immediateDec)[1];
                var value: number = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.ByteMask) {
                    throw "Immediate value of out range: " + value;
                }

                // strip the value to find what's remaining 
                parameter = parameter.replace(hex ? "#$" : "#", "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }
                
                var operation: IOperation = this.getOperationForMode(operations, OpCodes.ModeImmediate);
                if (operation === null) {
                    throw "Opcode doesn't support immediate mode " + opCodeName;
                }

                compiledLine.code.push(operation.opCode);
                compiledLine.code.push(value);
                compiledLine.processed = true;
                return compiledLine;
            }

            return compiledLine;
        }

        private labelExists(label: string, labels: ILabel[]): bool {
            var index: number; 
            for (index = 0; index < labels.length; index++) {
                if (labels[index].labelName === label) {
                    return true;
                }
            }
            return false;
        }     
    }
}