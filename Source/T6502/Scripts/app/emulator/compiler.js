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
            this.memorySet = /^\*[\s]*=[\s]*[\$]?[0-9a-f]*$/;
            this.setAddress = /^[\s]*\*[\s]*=[\s]*/;
            this.removeHex = /^\$/;
            this.immediateHex = /^\#\$([0-9A-F]{1,2})\s*/;
            this.immediateDec = /^\#(\d{1,3})\s*/;
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

                    label = label.replace(this.removeHex, "");
                    address = parseInt(label, hex ? 16 : 10);
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
                processed: false,
                label: ""
            };

            if (input.match(this.opCode)) {
                result = this.parseOpCode(labels, input, result);
            } else {
                throw "Invalid assembly " + input;
            }

            return result;
        };

        Compiler.prototype.compileSource = function (compilerResult) {
            this.consoleService.log("Starting compilation pass 2.");

            var idx;

            for (idx = 0; idx < compilerResult.compiledLines.length; idx++) {
                var compiledLine = compilerResult.compiledLines[idx];
                if (!compiledLine.processed) {
                    throw "Not implemented";
                }
            }

            return compilerResult;
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
                    parameter = parameter.replace(this.removeHex, "");
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
            var idx;

            var opCodeName = matches[1];
            var operations = [];

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

            var parameter = this.trimLine(opCodeExpression.replace(opCodeName, ""));

            if (!parameter.match(this.notWhitespace)) {
                var operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeSingle);
                if (operation === null) {
                    throw "Opcode requires a parameter " + opCodeName;
                }
                compiledLine.code.push(operation.opCode);
                compiledLine.processed = true;
                return compiledLine;
            }

            if (parameter.match(this.immediateHex) || parameter.match(this.immediateDec)) {
                var hex = parameter[1] === "$";
                var rawValue = parameter.match(hex ? this.immediateHex : this.immediateDec)[1];
                var value = parseInt(rawValue, hex ? 16 : 10);
                if (value < 0 || value > Constants.Memory.ByteMask) {
                    throw "Immediate value of out range: " + value;
                }

                parameter = parameter.replace(hex ? "#$" : "#", "");
                parameter = this.trimLine(parameter.replace(rawValue, ""));
                if (parameter.match(this.notWhitespace) && !parameter.match(this.comment)) {
                    throw "Invalid assembly: " + opCodeExpression;
                }

                var operation = this.getOperationForMode(operations, Emulator.OpCodes.ModeImmediate);
                if (operation === null) {
                    throw "Opcode doesn't support immediate mode " + opCodeName;
                }

                compiledLine.code.push(operation.opCode);
                compiledLine.code.push(value);
                compiledLine.processed = true;
                return compiledLine;
            }

            return compiledLine;
        };

        Compiler.prototype.labelExists = function (label, labels) {
            var index;
            for (index = 0; index < labels.length; index++) {
                if (labels[index].labelName === label) {
                    return true;
                }
            }
            return false;
        };
        return Compiler;
    })();
    Emulator.Compiler = Compiler;
})(Emulator || (Emulator = {}));
