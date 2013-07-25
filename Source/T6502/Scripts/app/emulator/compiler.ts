///<reference path='cpu.ts'/>
///<reference path='opCodes.ts'/>

module Emulator {

    // instance of the compiler/decompiler
    export interface ICompiler {
        compile(source: string): bool;
        decompile(startAddress: number): string;
    }

    // label includes the name for the label and its address
    export interface ILabel {
        address: number;
        labelName: string;
    }

    // a compiled line including the address it is at, any code, whether the 
    // label has been processed, the name of the label, and a high flag indicator
    // for resolving immediate mode labels (i.e. #<label and #>label)
    export interface ICompiledLine {
        address: number;
        operation: IOperation;
        code: number[];
        processed: boolean;
        label: string;
        high: boolean;
    }

    // the result of a compilation, which includes labels and compiled lines
    export interface ICompilerResult {
        labels: ILabel[];
        compiledLines: ICompiledLine[];
    }

    export class Compiler implements ICompiler {
    
        private pcAddress: number; // current address set by source
        private cpu: Emulator.ICpuExtended; 
        private consoleService: Services.ConsoleService;
        private opCodeCache: { [opCodeName: string] : IOperation[] };
        private opCode: RegExp = /^\s*([A-Z]{3})\s*\S*/;  // matches an op code          
        private notWhitespace: RegExp = /\S/; // true when there is non-whitespace
        private whitespaceTrim: RegExp = /^\s+/; // trim whitespace
        private whitespaceTrimEnd: RegExp = /\s+$/; // further trim whitespace
        private comment: RegExp = /^\;.*/; // ; comment line
        private memoryLabelHex: RegExp = /^(\$[0-9A-F]+):.*/; // $C000:
        private memoryLabelDec: RegExp = /^([0-9]+):.*/; // 49152:
        private regularLabel: RegExp = /^(\w+):.*/; // LABEL:
        private memorySet: RegExp = /^\*\s*\=\s*[\$]?[0-9A-F]*$/; // *=$C000 or *=49152
        private setAddress: RegExp = /^[\s]*\*[\s]*=[\s]*/; // for parsing out the value
        private immediate: RegExp = /^\#\$?([0-9A-F]{1,3})\s*/; // #$0A
        private immediateLabel: RegExp = /^\#([<>])(\w+)\s*/; // #<label or #>label 
        private absoluteX: RegExp = /^\$?([0-9A-F]{1,5})(\,\s*X)\s*/; // $C000, X 
        private absoluteXLabel: RegExp = /^(\w+)(\,\s*X)\s*/; // LABEL, X 
        private absoluteY: RegExp = /^\$?([0-9A-F]{1,5})(\,\s*Y)\s*/; // $C000, Y 
        private absoluteYLabel: RegExp = /^(\w+)(\,\s*Y)\s*/; // LABEL, Y 
        private absolute: RegExp = /^\$?([0-9A-F]{1,5})(^\S)*(\s*\;.*)?$/;  // JMP $C000
        private absoluteLabel: RegExp = /^([A-Z_][A-Z0-9_]+)\s*/; // JMP LABEL
            
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
                // first pass actually compiles and picks up labels, then flags 
                // compiled lines that must be updated because they reference labels
                // that are defined later 
                var compiled: ICompilerResult = this.parseLabels(lines);

                // this pass simply goes through and updates the labels or throws 
                // an exception if a label is not found 
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
                this.cpu.rPC = this.pcAddress; // most recent address set in source
            }
            catch (e) {
                this.consoleService.log(e);
                return false;
            }

            return true;
        }
        
        // parses out labels but compiles as it goes because it needs to know the size
        // of the current line to keep track of labels
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

                // check if the user is setting the address
                var testAddress: number = this.moveAddress(input);

                // if so, update that and continue
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
                    label = label.replace("$", "");
                    address = parseInt(label, hex ? 16 : 10); 
                    
                    if (address < 0 || address > Constants.Memory.Max) {
                        throw "Address out of range: " + label; 
                    }                                    
                    
                    this.pcAddress = address;   
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
                operation: null,
                processed: false,
                label: "",
                high: false
            };

            if (input.match(this.opCode)) {
                result = this.parseOpCode(labels, input, result);
            }
            else {
                throw "Invalid assembly " + input;
            }
            
            return result;
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
                    parameter = parameter.replace("$", "");
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
            var matchArray: string[];
            var idx: number;
            var hex: boolean;
            var rawValue: string;
            var value: number;
            var xIndex: string;
            var yIndex: string;
            var opCodeName: string = matches[1];
            var operations: IOperation[] = [];
            var parameter: string;
            var labelReady: boolean;
            var label: string;
            var labelInstance: ILabel;
            var processed: boolean;

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

            processed = true;

            parameter = this.trimLine(opCodeExpression.replace(opCodeName, ""));

            // branches 
            if (operations[0].addressingMode === OpCodes.ModeRelative) {
            
                // absolute with label 
                compiledLine.processed = true;
                parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absolute, this.absoluteLabel);
                processed = compiledLine.processed;

                // absolute mode 
                if (matchArray = parameter.match(this.absolute)) {
                    hex = parameter[0] === "$"; 
                    rawValue = matchArray[1];
                    value = parseInt(rawValue, hex ? 16 : 10);
                    if (value < 0 || value > Constants.Memory.Size) {
                        throw "Absolute value of out range: " + value;
                    }

                    // strip the value to find what's remaining
                    if (hex) { 
                        parameter = parameter.replace("$", "");
                    }
                    parameter = this.trimLine(parameter.replace(rawValue, ""));
                    if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                        throw "Invalid assembly: " + opCodeExpression;
                    }

                    compiledLine.operation = operations[0];

                    compiledLine.code.push(compiledLine.operation.opCode);

                    var offset: number;

                    if (value <= compiledLine.address) {
                        offset = Constants.Memory.ByteMask - ((compiledLine.address + 1) - value); 
                    }
                    else {
                        offset = (value - compiledLine.address) - 2;
                    }

                    compiledLine.code.push(offset & Constants.Memory.ByteMask);
                    compiledLine.processed = processed;
                    return compiledLine;
                }
                else {
                    throw "Invalid branch.";
                } 
            }

            // single only 
            if (!parameter.match(this.notWhitespace)) {
                compiledLine.operation = this.getOperationForMode(operations, OpCodes.ModeSingle);
                if (compiledLine.operation === null) {
                    throw "Opcode requires a parameter " + opCodeName;
                }
                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.processed = processed;
                return compiledLine;
            }

            // immediate with label 
            if (!parameter.match(this.immediate)) {
                if (matchArray = parameter.match(this.immediateLabel)) {
                    compiledLine.high = matchArray[1] === ">"; 
                    label = matchArray[2];
                    labelInstance = this.findLabel(label, labels);
                    if (labelInstance !== null) {
                        value = compiledLine.high ? (labelInstance.address >> Constants.Memory.BitsInByte) : 
                            labelInstance.address;
                        parameter = parameter.replace(matchArray[0], "#" + (value & Constants.Memory.ByteMask).toString(10));
                    }
                    else {
                        compiledLine.label = label;
                        processed = false;
                        parameter = parameter.replace(matchArray[0], "#0");
                    }
                }
            }

            // immediate mode 
            if (matchArray = parameter.match(this.immediate)) {
                
                hex = parameter[1] === "$"; 
                rawValue = matchArray[1];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.ByteMask) {
                    throw "Immediate value of out range: " + value;
                }

                // strip the value to find what's remaining 
                parameter = parameter.replace(hex ? "#$" : "#", "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }
                
                compiledLine.operation = this.getOperationForMode(operations, OpCodes.ModeImmediate);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support immediate mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value);
                compiledLine.processed = processed;
                return compiledLine;
            }

            compiledLine.processed = true;
            parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absoluteX, this.absoluteXLabel);
            processed = compiledLine.processed; 
            
            // absolute with X-index mode 
            if (matchArray = parameter.match(this.absoluteX)) {
                hex = parameter[0] === "$";
                rawValue = matchArray[1];
                xIndex = matchArray[2];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute X-Indexed value of out range: " + value;
                }

                // strip the value to find what's remaining
                if (hex) { 
                    parameter = parameter.replace("$", "");
                }

                // strip the index
                parameter = parameter.replace(xIndex, "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }
                
                compiledLine.operation = this.getOperationForMode(operations, OpCodes.ModeAbsoluteX);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support absolute X-indexed mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask); 
                compiledLine.processed = processed;
                return compiledLine;
            }

            // absolute with Y-index label 
            compiledLine.processed = true;
            parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absoluteY, this.absoluteYLabel);
            processed = compiledLine.processed;

            // absolute with Y-index mode 
            if (matchArray = parameter.match(this.absoluteY)) {
                hex = parameter[0] === "$";
                rawValue = matchArray[1];
                yIndex = matchArray[2];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute Y-Indexed value of out range: " + value;
                }

                // strip the value to find what's remaining
                if (hex) { 
                    parameter = parameter.replace("$", "");
                }

                // strip the index
                parameter = parameter.replace(yIndex, "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }
                
                compiledLine.operation = this.getOperationForMode(operations, OpCodes.ModeAbsoluteY);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support absolute Y-indexed mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask); 
                compiledLine.processed = true;
                return compiledLine;
            }

            // absolute with label 
            compiledLine.processed = true;
            parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absolute, this.absoluteLabel);
            processed = compiledLine.processed;

            // absolute mode 
            if (matchArray = parameter.match(this.absolute)) {
                hex = parameter[0] === "$"; 
                rawValue = matchArray[1];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute value of out range: " + value;
                }

                // strip the value to find what's remaining
                if (hex) { 
                    parameter = parameter.replace("$", "");
                }
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                var mode: number = value <= Constants.Memory.ByteMask ? OpCodes.ModeZeroPage : OpCodes.ModeAbsolute;
                
                compiledLine.operation = this.getOperationForMode(operations, mode);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support absolute mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                
                if (mode === OpCodes.ModeAbsolute) {
                    compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask); 
                }
                compiledLine.processed = true;
                return compiledLine;
            }

            throw "Unable to parse " + opCodeExpression;
        }

        
        private compileSource(compilerResult: ICompilerResult): ICompilerResult {

            this.consoleService.log("Starting compilation pass 2.");

            var idx: number;

            for (idx = 0; idx < compilerResult.compiledLines.length; idx ++) {
                var compiledLine = compilerResult.compiledLines[idx];
                if (!compiledLine.processed) {
                    var labelInstance: ILabel = this.findLabel(compiledLine.label, compilerResult.labels);
                    if (labelInstance === null) {
                        throw "Label not defined: " + compiledLine.label;
                    }                        
                    if (compiledLine.operation.sizeBytes === 2) {

                        if (compiledLine.operation.addressingMode === OpCodes.ModeRelative) {
                            var offset: number;

                            if (labelInstance.address <= compiledLine.address) {
                                offset = Constants.Memory.ByteMask - ((compiledLine.address + 1) - labelInstance.address); 
                            }
                            else {
                                offset = (labelInstance.address - compiledLine.address) - 2;
                            }
                            compiledLine.code[1] = offset & Constants.Memory.ByteMask;
                        }
                        else { 
                            var value: number = compiledLine.high ? (labelInstance.address >> Constants.Memory.BitsInByte) : 
                                labelInstance.address;
                            compiledLine.code[1] = value & Constants.Memory.ByteMask;
                        }
                        compiledLine.processed = true;
                        continue;
                    }
                    else if (compiledLine.operation.sizeBytes === 3) {
                        compiledLine.code[1] = labelInstance.address & Constants.Memory.ByteMask;
                        compiledLine.code[2] = (labelInstance.address >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask;
                        compiledLine.processed = true;
                        continue;
                    }
                    throw "Not implemented";
                }
            }

            return compilerResult;
        }

        private labelExists(label: string, labels: ILabel[]): bool {
            return this.findLabel(label, labels) !== null;
        }
        
        private findLabel(label: string, labels: ILabel[]): ILabel {
            var index: number; 
            for (index = 0; index < labels.length; index++) {
                if (labels[index].labelName === label) {
                    return labels[index];
                }
            }
            return null;
        }    
        
        private parseAbsoluteLabel(
            parameter: string, 
            compiledLine: ICompiledLine, 
            labels: ILabel[], 
            targetExpr: RegExp, 
            labelExpr: RegExp): string {
            var matchArray: string[];
            
            if (!parameter.match(targetExpr)) {
                if (matchArray = parameter.match(labelExpr)) {
                    var label: string = matchArray[1];
                    var labelInstance: ILabel = this.findLabel(label, labels);
                    if (labelInstance !== null) {
                        var value: number = labelInstance.address;
                        parameter = parameter.replace(matchArray[1], value.toString(10));
                    }
                    else {
                        compiledLine.label = label;
                        compiledLine.processed = false;
                        parameter = parameter.replace(matchArray[1], "65535");
                    }
                }
            }
            return parameter;
        }
    }
}