var Emulator;
(function (Emulator) {
    var Compiler = (function () {
        function Compiler(cpu, consoleService) {
            this.cpu = cpu;
            this.consoleService = consoleService;
        }
        Compiler.prototype.decompile = function (startAddress) {
            var address = startAddress & Constants.Memory.Max;
            var instructions = 0;
            var lines = [];
            while(instructions < 50 && address <= Constants.Memory.Max) {
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
            this.consoleService.log("Starting compilation.");
            var start = 0xC000;
            var lines = source.split('\n');
            var labels = this.parseLabels(lines);
        };
        Compiler.prototype.parseLabels = function (lines) {
            var memoryLabel = /^(\$\w+):.*/;
            var regularLabel = /^(\w+):.*/;
            var labels = [];
            var memoryLabels = 0;
            var actualLabels = 0;
            var idx;
            for(idx = 0; idx < lines.length; idx++) {
                var input = lines[idx];
                if(input.match(memoryLabel)) {
                    memoryLabels++;
                } else {
                    if(input.match(regularLabel)) {
                        var label = regularLabel.exec(input)[1];
                        actualLabels++;
                    }
                }
            }
            this.consoleService.log("Parsed " + memoryLabels + " memory tags and " + actualLabels + " labels.");
            return labels;
        };
        return Compiler;
    })();
    Emulator.Compiler = Compiler;    
})(Emulator || (Emulator = {}));
