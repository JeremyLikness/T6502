var Emulator;
(function (Emulator) {
    var Compiler = (function () {
        function Compiler(cpu, consoleService) {
            this.opCode = /^\s+([A-Za-z]{3})\s*(\S*)/;
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

            this.consoleService.log("Starting compilation.");

            try  {
                var compilerResult = this.compileSource(lines);
                this.consoleService.log("Compilation passes complete; moving buffer into memory at $" + compilerResult.startAddress.toString(16).toUpperCase());
            } catch (e) {
                this.consoleService.log(e);
            }
        };

        Compiler.prototype.compileSource = function (lines) {
            var compilerResult = {
                startAddress: Constants.Memory.DefaultStart,
                opCodes: []
            };

            var address = compilerResult.startAddress;
            var addressSet = false;
            var memoryIgnore = false;
            var notWhitespace = /\S/;
            var whitespaceTrim = /^\s+/;
            var whitespaceTrimEnd = /\s+$/;
            var comment = /^\;.*/;
            var memoryLabel = /^(\$\w+):.*/;
            var regularLabel = /^(\w+):.*/;
            var labels = [];
            var label;
            var opCodeLabel;
            var buffer = [];
            var memoryLabels = 0;
            var actualLabels = 0;
            var idx;

            this.consoleService.log("Starting compilation pass 1.");

            for (idx = 0; idx < lines.length; idx++) {
                var input = lines[idx];

                if (!notWhitespace.test(input)) {
                    continue;
                }

                if (comment.test(input)) {
                    continue;
                }

                input = input.replace(whitespaceTrim, "").replace(whitespaceTrimEnd, "");

                if (input.match(memoryLabel)) {
                    memoryLabels++;

                    label = memoryLabel.exec(input)[1];

                    input = input.replace(label + ":", "");

                    if (!addressSet) {
                        addressSet = true;
                        label = label.replace("$", "");
                        compilerResult.startAddress = parseInt(label, 16);
                    } else {
                        memoryIgnore = true;
                    }
                } else {
                    if (input.match(regularLabel)) {
                        label = regularLabel.exec(input)[1].toUpperCase();
                        if (this.labelExists(label, labels)) {
                            throw "Duplicate label " + label + " found at line " + (idx + 1);
                        }
                        labels.push({
                            address: address,
                            labelName: label
                        });
                        actualLabels++;
                        input = input.replace(label + ":", "");
                    }
                }

                if (input.match(comment)) {
                    continue;
                }

                if (!input.match(notWhitespace)) {
                    continue;
                }

                if (input.match(this.opCode)) {
                    try  {
                        var instructions = this.parseOpCode(input);
                    } catch (e) {
                        throw e + " (Line " + (idx + 1) + ").";
                    }
                } else {
                    throw "Invalid assembly line " + (idx + 1) + ": " + lines[idx] + ".";
                }
            }

            if (memoryIgnore) {
                this.consoleService.log("Compilation address may only be set once. Some memory labels were ignored.");
            }
            this.consoleService.log("Parsed " + memoryLabels + " memory tags and " + actualLabels + " labels.");

            return compilerResult;
        };

        Compiler.prototype.parseOpCode = function (opCodeExpression) {
            var returnValue = [];
            var matches = this.opCode.exec(opCodeExpression);

            var opCodeName = matches[1].toUpperCase();
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

            return returnValue;
        };

        Compiler.prototype.labelExists = function (label, labels) {
            var idx;
            for (idx = 0; idx < labels.length; idx++) {
                if (labels[idx].labelName === label) {
                    return true;
                }
            }
            return false;
        };
        return Compiler;
    })();
    Emulator.Compiler = Compiler;
})(Emulator || (Emulator = {}));
