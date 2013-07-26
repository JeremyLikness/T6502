var Emulator;
(function (Emulator) {
    var Compiler = (function () {
        function Compiler(cpu, consoleService) {
            this.opCode = /^\s*([A-Z]{3})\s*\S*/;
            this.notWhitespace = /\S/;
            this.whitespaceTrim = /^\s+/;
            this.whitespaceTrimEnd = /\s+$/;
            this.comment = /^\;.*/;
            this.memoryLabelHex = /^(\$[0-9A-F]+):.*/;
            this.memoryLabelDec = /^([0-9]+):.*/;
            this.regularLabel = /^(\w+):.*/;
            this.memorySet = /^\*\s*\=\s*[\$]?[0-9A-F]*$/;
            this.setAddress = /^[\s]*\*[\s]*=[\s]*/;
            this.immediate = /^\#\$?([0-9A-F]{1,3})\s*/;
            this.immediateLabel = /^\#([<>])(\w+)\s*/;
            this.indirectX = /^\(\$?([0-9A-F]{1,3})(\,\s*X)\)\s*/;
            this.indirectY = /^\(\$?([0-9A-F]{1,3})\)(\,\s*Y)\s*/;
            this.absoluteX = /^\$?([0-9A-F]{1,5})(\,\s*X)\s*/;
            this.absoluteXLabel = /^(\w+)(\,\s*X)\s*/;
            this.absoluteY = /^\$?([0-9A-F]{1,5})(\,\s*Y)\s*/;
            this.absoluteYLabel = /^(\w+)(\,\s*Y)\s*/;
            this.indirect = /^\(\$?([0-9A-F]{1,5})\)(^\S)*(\s*\;.*)?$/;
            this.indirectLabel = /^\(([A-Z_][A-Z0-9_]+)\)\s*/;
            this.absolute = /^\$?([0-9A-F]{1,5})(^\S)*(\s*\;.*)?$/;
            this.absoluteLabel = /^([A-Z_][A-Z0-9_]+)\s*/;
            this.cpu = cpu;
            this.consoleService = consoleService;
            this.opCodeCache = {};
        }
        Compiler.prototype.decompile = function (startAddress) {
            var address = startAddress & Constants.Memory.Max;
            var instructions = 0;
            var lines = [];

            while (instructions < Constants.Memory.MaxInstructionsDecompile && address <= Constants.Memory.Max) {
                var opCode = this.cpu.peek(address);

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
        };

        Compiler.prototype.compile = function (source) {
            var lines = source.split('\n');
            this.pcAddress = this.cpu.rPC;

            this.consoleService.log("Starting compilation.");

            try  {
                var compiled = this.parseLabels(lines);

                compiled = this.compileSource(compiled);

                this.consoleService.log("Compilation complete.");

                var idx;
                var offset;
                for (idx = 0; idx < compiled.compiledLines.length; idx++) {
                    var compiledLine = compiled.compiledLines[idx];
                    for (offset = 0; offset < compiledLine.code.length; offset++) {
                        this.cpu.poke(compiledLine.address + offset, compiledLine.code[offset]);
                    }
                }
                this.consoleService.log("Code loaded to memory.");
                this.cpu.rPC = this.pcAddress;
            } catch (e) {
                this.consoleService.log(e);
                return false;
            }

            return true;
        };

        Compiler.prototype.parseLabels = function (lines) {
            var address = Constants.Memory.DefaultStart;
            var label;
            var opCodeLabel;
            var buffer = [];
            var memoryLabels = 0;
            var actualLabels = 0;
            var idx;
            var parameter;

            var result = {
                labels: [],
                compiledLines: []
            };

            this.consoleService.log("Starting compilation pass 1.");

            for (idx = 0; idx < lines.length; idx++) {
                var input = lines[idx].toUpperCase();

                input = this.trimLine(input);

                if (!input.match(this.notWhitespace)) {
                    continue;
                }

                var testAddress = this.moveAddress(input);

                if (!(isNaN(testAddress))) {
                    this.pcAddress = testAddress;
                    address = testAddress;
                    continue;
                }

                if (input.match(this.memoryLabelHex) || input.match(this.memoryLabelDec)) {
                    memoryLabels++;
                    var hex = input.match(this.memoryLabelHex);
                    label = hex ? this.memoryLabelHex.exec(input)[1] : this.memoryLabelDec.exec(input)[1];

                    input = input.replace(label + ":", "");

                    label = label.replace("$", "");
                    address = parseInt(label, hex ? 16 : 10);

                    if (address < 0 || address > Constants.Memory.Max) {
                        throw "Address out of range: " + label;
                    }

                    this.pcAddress = address;
                } else {
                    if (input.match(this.regularLabel)) {
                        label = this.regularLabel.exec(input)[1];
                        if (this.labelExists(label, result.labels)) {
                            throw "Duplicate label " + label + " found at line " + (idx + 1);
                        }
                        result.labels.push({
                            address: address,
                            labelName: label
                        });
                        actualLabels++;
                        input = input.replace(label + ":", "");
                    }
                }

                if (!input.match(this.notWhitespace)) {
                    continue;
                }

                try  {
                    var compiledLine = this.compileLine(result.labels, address, input);
                    result.compiledLines.push(compiledLine);
                    address += compiledLine.code.length;
                } catch (e) {
                    throw e + " Line: " + (idx + 1);
                }
            }

            this.consoleService.log("Parsed " + memoryLabels + " memory tags and " + actualLabels + " labels.");

            return result;
        };

        Compiler.prototype.compileLine = function (labels, address, input) {
            var result = {
                address: address,
                code: [],
                operation: null,
                processed: false,
                label: "",
                high: false
            };

            if (input.match(this.opCode)) {
                result = this.parseOpCode(labels, input, result);
            } else {
                throw "Invalid assembly " + input;
            }

            return result;
        };

        Compiler.prototype.trimLine = function (input) {
            if (!this.notWhitespace.test(input)) {
                return "";
            }

            if (this.comment.test(input)) {
                return "";
            }

            input = input.replace(this.whitespaceTrim, "").replace(this.whitespaceTrimEnd, "");

            return input;
        };

        Compiler.prototype.moveAddress = function (input) {
            var parameter;
            var address = NaN;

            if (input.match(this.memorySet)) {
                parameter = input.replace(this.setAddress, "");
                if (parameter[0] === "$") {
                    parameter = parameter.replace("$", "");
                    address = parseInt(parameter, 16);
                } else {
                    address = parseInt(parameter, 10);
                }

                if ((address < 0) || (address > Constants.Memory.Max)) {
                    throw "Address out of range";
                }
            }

            return address;
        };

        Compiler.prototype.getOperationForMode = function (operations, addressMode) {
            var idx = 0;
            for (idx = 0; idx < operations.length; idx++) {
                if (operations[idx].addressingMode === addressMode) {
                    return operations[idx];
                }
            }

            return null;
        };

        Compiler.prototype.parseOpCode = function (labels, opCodeExpression, compiledLine) {
            var matches = this.opCode.exec(opCodeExpression);
            var matchArray;
            var idx;
            var hex;
            var rawValue;
            var value;
            var xIndex;
            var yIndex;
            var opCodeName = matches[1];
            var operations = [];
            var parameter;
            var labelReady;
            var label;
            var labelInstance;
            var processed;

            if (opCodeName in this.opCodeCache) {
                operations = this.opCodeCache[opCodeName];
            } else {
                operations = Emulator.OpCodes.LoadOpCodesByName(opCodeName);
                if (operations.length > 0) {
                    this.opCodeCache[opCodeName] = operations;
                } else {
                    throw "Invalid op code: " + opCodeName;
                }
            }

            processed = true;

            parameter = this.trimLine(opCodeExpression.replace(opCodeName, ""));

            if (operations[0].addressingMode === Emulator.OpCodes.ModeRelative) {
                compiledLine.processed = true;
                parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absolute, this.absoluteLabel);
                processed = compiledLine.processed;

                if (matchArray = parameter.match(this.absolute)) {
                    hex = parameter[0] === "$";
                    rawValue = matchArray[1];
                    value = parseInt(rawValue, hex ? 16 : 10);
                    if (value < 0 || value > Constants.Memory.Size) {
                        throw "Absolute value of out range: " + value;
                    }

                    if (hex) {
                        parameter = parameter.replace("$", "");
                    }
                    parameter = this.trimLine(parameter.replace(rawValue, ""));
                    if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                        throw "Invalid assembly: " + opCodeExpression;
                    }

                    compiledLine.operation = operations[0];

                    compiledLine.code.push(compiledLine.operation.opCode);

                    var offset;

                    if (value <= compiledLine.address) {
                        offset = Constants.Memory.ByteMask - ((compiledLine.address + 1) - value);
                    } else {
                        offset = (value - compiledLine.address) - 2;
                    }

                    compiledLine.code.push(offset & Constants.Memory.ByteMask);
                    compiledLine.processed = processed;
                    return compiledLine;
                } else {
                    throw "Invalid branch.";
                }
            }

            if (!parameter.match(this.notWhitespace)) {
                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeSingle);
                if (compiledLine.operation === null) {
                    throw "Opcode requires a parameter " + opCodeName;
                }
                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.processed = processed;
                return compiledLine;
            }

            if (matchArray = parameter.match(this.indirectX)) {
                hex = parameter[1] === "$";
                rawValue = matchArray[1];
                xIndex = matchArray[2];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.ByteMask) {
                    throw "Indirect X-Indexed value of out range: " + value;
                }

                if (hex) {
                    parameter = parameter.replace("$", "");
                }

                parameter = parameter.replace("(", "").replace(")", "");
                parameter = parameter.replace(xIndex, "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeIndexedIndirectX);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support indirect X-indexed mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.processed = processed;
                return compiledLine;
            }

            if (matchArray = parameter.match(this.indirectY)) {
                hex = parameter[1] === "$";
                rawValue = matchArray[1];
                yIndex = matchArray[2];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.ByteMask) {
                    throw "Indexed Indirect-Y value of out range: " + value;
                }

                if (hex) {
                    parameter = parameter.replace("$", "");
                }

                parameter = parameter.replace("(", "").replace(")", "");
                parameter = parameter.replace(yIndex, "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeIndexedIndirectY);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support indirected indexed-Y mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.processed = processed;
                return compiledLine;
            }

            if (!parameter.match(this.immediate)) {
                if (matchArray = parameter.match(this.immediateLabel)) {
                    compiledLine.high = matchArray[1] === ">";
                    label = matchArray[2];
                    labelInstance = this.findLabel(label, labels);
                    if (labelInstance !== null) {
                        value = compiledLine.high ? (labelInstance.address >> Constants.Memory.BitsInByte) : labelInstance.address;
                        parameter = parameter.replace(matchArray[0], "#" + (value & Constants.Memory.ByteMask).toString(10));
                    } else {
                        compiledLine.label = label;
                        processed = false;
                        parameter = parameter.replace(matchArray[0], "#0");
                    }
                }
            }

            if (matchArray = parameter.match(this.immediate)) {
                hex = parameter[1] === "$";
                rawValue = matchArray[1];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.ByteMask) {
                    throw "Immediate value of out range: " + value;
                }

                parameter = parameter.replace(hex ? "#$" : "#", "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeImmediate);
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

            if (matchArray = parameter.match(this.absoluteX)) {
                hex = parameter[0] === "$";
                rawValue = matchArray[1];
                xIndex = matchArray[2];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute X-Indexed value of out range: " + value;
                }

                if (hex) {
                    parameter = parameter.replace("$", "");
                }

                parameter = parameter.replace(xIndex, "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeAbsoluteX);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support absolute X-indexed mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                compiledLine.processed = processed;
                return compiledLine;
            }

            compiledLine.processed = true;
            parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absoluteY, this.absoluteYLabel);
            processed = compiledLine.processed;

            if (matchArray = parameter.match(this.absoluteY)) {
                hex = parameter[0] === "$";
                rawValue = matchArray[1];
                yIndex = matchArray[2];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute Y-Indexed value of out range: " + value;
                }

                if (hex) {
                    parameter = parameter.replace("$", "");
                }

                parameter = parameter.replace(yIndex, "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeAbsoluteY);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support absolute Y-indexed mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                compiledLine.processed = true;
                return compiledLine;
            }

            compiledLine.processed = true;
            parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.indirect, this.indirectLabel);
            processed = compiledLine.processed;

            if (matchArray = parameter.match(this.indirect)) {
                hex = parameter[1] === "$";
                rawValue = matchArray[1];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute value of out range: " + value;
                }

                if (hex) {
                    parameter = parameter.replace("$", "");
                }
                parameter = parameter.replace("(", "").replace(")", "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                compiledLine.operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeIndirect);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support indirect mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);
                compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                compiledLine.processed = processed;
                return compiledLine;
            }

            compiledLine.processed = true;
            parameter = this.parseAbsoluteLabel(parameter, compiledLine, labels, this.absolute, this.absoluteLabel);
            processed = compiledLine.processed;

            if (matchArray = parameter.match(this.absolute)) {
                hex = parameter[0] === "$";
                rawValue = matchArray[1];
                value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.Size) {
                    throw "Absolute value of out range: " + value;
                }

                if (hex) {
                    parameter = parameter.replace("$", "");
                }
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                var mode = value <= Constants.Memory.ByteMask ? Emulator.OpCodes.ModeZeroPage : Emulator.OpCodes.ModeAbsolute;

                compiledLine.operation = this.getOperationForMode(operations, mode);
                if (compiledLine.operation === null) {
                    throw "Opcode doesn't support absolute mode " + opCodeName;
                }

                compiledLine.code.push(compiledLine.operation.opCode);
                compiledLine.code.push(value & Constants.Memory.ByteMask);

                if (mode === Emulator.OpCodes.ModeAbsolute) {
                    compiledLine.code.push((value >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                }
                compiledLine.processed = true;
                return compiledLine;
            }

            throw "Unable to parse " + opCodeExpression;
        };

        Compiler.prototype.compileSource = function (compilerResult) {
            this.consoleService.log("Starting compilation pass 2.");

            var idx;

            for (idx = 0; idx < compilerResult.compiledLines.length; idx++) {
                var compiledLine = compilerResult.compiledLines[idx];
                if (!compiledLine.processed) {
                    var labelInstance = this.findLabel(compiledLine.label, compilerResult.labels);
                    if (labelInstance === null) {
                        throw "Label not defined: " + compiledLine.label;
                    }
                    if (compiledLine.operation.sizeBytes === 2) {
                        if (compiledLine.operation.addressingMode === Emulator.OpCodes.ModeRelative) {
                            var offset;

                            if (labelInstance.address <= compiledLine.address) {
                                offset = Constants.Memory.ByteMask - ((compiledLine.address + 1) - labelInstance.address);
                            } else {
                                offset = (labelInstance.address - compiledLine.address) - 2;
                            }
                            compiledLine.code[1] = offset & Constants.Memory.ByteMask;
                        } else {
                            var value = compiledLine.high ? (labelInstance.address >> Constants.Memory.BitsInByte) : labelInstance.address;
                            compiledLine.code[1] = value & Constants.Memory.ByteMask;
                        }
                        compiledLine.processed = true;
                        continue;
                    } else if (compiledLine.operation.sizeBytes === 3) {
                        compiledLine.code[1] = labelInstance.address & Constants.Memory.ByteMask;
                        compiledLine.code[2] = (labelInstance.address >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask;
                        compiledLine.processed = true;
                        continue;
                    }
                    throw "Not implemented";
                }
            }

            return compilerResult;
        };

        Compiler.prototype.labelExists = function (label, labels) {
            return this.findLabel(label, labels) !== null;
        };

        Compiler.prototype.findLabel = function (label, labels) {
            var index;
            for (index = 0; index < labels.length; index++) {
                if (labels[index].labelName === label) {
                    return labels[index];
                }
            }
            return null;
        };

        Compiler.prototype.parseAbsoluteLabel = function (parameter, compiledLine, labels, targetExpr, labelExpr) {
            var matchArray;

            if (!parameter.match(targetExpr)) {
                if (matchArray = parameter.match(labelExpr)) {
                    var label = matchArray[1];
                    var labelInstance = this.findLabel(label, labels);
                    if (labelInstance !== null) {
                        var value = labelInstance.address;
                        parameter = parameter.replace(matchArray[1], value.toString(10));
                    } else {
                        compiledLine.label = label;
                        compiledLine.processed = false;
                        parameter = parameter.replace(matchArray[1], "65535");
                    }
                }
            }
            return parameter;
        };
        return Compiler;
    })();
    Emulator.Compiler = Compiler;
})(Emulator || (Emulator = {}));
