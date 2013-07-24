var Tests;
(function (Tests) {
    describe("compiler", function () {
        var cpuSvc;
        var cpu;
        var consoleSvc;
        var compiler;

        function toHexAddress(address) {
            var padding = "0000";
            var result = padding + address.toString(16);
            return result.substring(result.length - 4, result.length).toUpperCase();
        }

        beforeEach(function () {
            module('app');
        });

        beforeEach(function () {
            inject(function (cpuService, consoleService) {
                cpuSvc = cpuService;
                consoleSvc = consoleService;
                cpu = cpuSvc.getCpu();
                compiler = cpuSvc.getCompiler();
            });
        });

        describe("given compiler when decompiler called with code", function () {
            beforeEach(function () {
                var jmpAbsolute = new Emulator.JmpAbsolute();
                var address = cpu.rPC;

                cpu.poke(cpu.rPC, jmpAbsolute.opCode);
                cpu.poke(cpu.rPC + 1, address & Constants.Memory.ByteMask);
                cpu.poke(cpu.rPC + 2, address >> Constants.Memory.BitsInByte);
            });

            it("then should return the decompiled code", function () {
                var actual = compiler.decompile(cpu.rPC);
                expect(actual).toContain("$" + toHexAddress(cpu.rPC) + ": JMP $" + toHexAddress(cpu.rPC));
            });
        });

        describe("given compiler when compile called with simple code", function () {
            beforeEach(function () {
                compiler.compile("JMP $" + toHexAddress(cpu.rPC));
            });

            it("then should compile the code at the default address", function () {
                var jmpOpcode = new Emulator.JmpAbsolute();
                var expected = [
                    jmpOpcode.opCode,
                    cpu.rPC & Constants.Memory.ByteMask,
                    (cpu.rPC >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask
                ];
                var actual = [
                    cpu.peek(cpu.rPC),
                    cpu.peek(cpu.rPC + 1),
                    cpu.peek(cpu.rPC + 2)
                ];
                expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
            });
        });

        describe("given compiler when compile called with comments", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile(";this is a comment     \n" + ";this is another comment.");
            });

            it("then should ignore the comments", function () {
                expect(result).toBe(true);
            });
        });

        describe("given compiler when a memory label is specified", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("$C000: JMP $C000");
            });

            it("then should compile starting at the memory address", function () {
                var jmpOpcode = new Emulator.JmpAbsolute();
                var expected = [
                    jmpOpcode.opCode,
                    0x00,
                    0xc0
                ];
                var actual = [
                    cpu.peek(0xc000),
                    cpu.peek(0xc001),
                    cpu.peek(0xc002)
                ];
                expect(result).toBe(true);
                expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
            });

            it("then should set the program counter to the start address", function () {
                expect(cpu.rPC).toBe(0xc000);
            });
        });

        describe("given compiler when a start address is specified", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("* = $C000      \n" + "JMP $C000        ");
            });

            it("then should set the start address to the specified address and compile the code", function () {
                var jmpOpcode = new Emulator.JmpAbsolute();
                var expected = [
                    jmpOpcode.opCode,
                    0x00,
                    0xc0
                ];
                var actual = [
                    cpu.peek(0xc000),
                    cpu.peek(0xc001),
                    cpu.peek(0xc002)
                ];
                expect(result).toBe(true);
                expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
            });

            it("then should set the program counter to the start address", function () {
                expect(cpu.rPC).toBe(0xc000);
            });
        });

        describe("given compiler when a start address is specified with decimal", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("* = 49152      \n" + "JMP 49152        ");
            });

            it("then should set the start address to the specified address and compile the code", function () {
                var jmpOpcode = new Emulator.JmpAbsolute();
                var expected = [
                    jmpOpcode.opCode,
                    0x00,
                    0xc0
                ];
                var actual = [
                    cpu.peek(0xc000),
                    cpu.peek(0xc001),
                    cpu.peek(0xc002)
                ];
                expect(result).toBe(true);
                expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
            });

            it("then should set the program counter to the start address", function () {
                expect(cpu.rPC).toBe(0xc000);
            });
        });

        describe("given compiler when source is provided with labels", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("LOOP: JMP LOOP");
            });

            it("then should resolve the labels and compile the code using the appropriate addresses", function () {
                var jmpOpcode = new Emulator.JmpAbsolute();
                var expected = [
                    jmpOpcode.opCode,
                    cpu.rPC & Constants.Memory.ByteMask,
                    (cpu.rPC >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask
                ];
                var actual = [
                    cpu.peek(cpu.rPC),
                    cpu.peek(cpu.rPC + 1),
                    cpu.peek(cpu.rPC + 2)
                ];
                expect(result).toBe(true);
                expect(JSON.stringify(actual)).toEqual(JSON.stringify(expected));
            });
        });

        describe("given compiler when source is provided with duplicate labels", function () {
            var result;
            var currentCode;

            beforeEach(function () {
                currentCode = [
                    cpu.peek(cpu.rPC),
                    cpu.peek(cpu.rPC + 1),
                    cpu.peek(cpu.rPC + 2)
                ];

                result = compiler.compile("LOOP: JMP LOOP      \n" + "LOOP: JMP LOOP");
            });

            it("then should not compile and log a message to the console", function () {
                expect(result).toBe(false);
                var actual = [
                    cpu.peek(cpu.rPC),
                    cpu.peek(cpu.rPC + 1),
                    cpu.peek(cpu.rPC + 2)
                ];
                expect(JSON.stringify(actual)).toBe(JSON.stringify(currentCode));
            });
        });

        describe("given compiler when source is provided with invalid op codes", function () {
            var result;
            var currentCode;

            beforeEach(function () {
                currentCode = [
                    cpu.peek(cpu.rPC),
                    cpu.peek(cpu.rPC + 1),
                    cpu.peek(cpu.rPC + 2)
                ];

                result = compiler.compile("BLEH $C000");
            });

            it("then should not compile and log a message to the console", function () {
                expect(result).toBe(false);
                var actual = [
                    cpu.peek(cpu.rPC),
                    cpu.peek(cpu.rPC + 1),
                    cpu.peek(cpu.rPC + 2)
                ];
                expect(JSON.stringify(actual)).toBe(JSON.stringify(currentCode));
            });
        });

        describe("given compiler when a return from subroutine is specified", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("* = 49152      \n" + "RTS        ");
            });

            it("then should set the RTS op code at the memory location", function () {
                var rtsCode = new Emulator.RtsSingle();
                expect(result).toBe(true);
                expect(cpu.peek(0xc000)).toEqual(rtsCode.opCode);
            });

            it("then should set the program counter to the start address", function () {
                expect(cpu.rPC).toBe(0xc000);
            });
        });

        describe("given compiler when immediate mode is specified", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("LDA #$0A   \n" + "LDA #22   ; this is a comment");
            });

            it("then should handle a hex value", function () {
                expect(result).toBe(true);
                expect(cpu.peek(cpu.rPC + 1)).toBe(0x0A);
            });

            it("then should handle the decimal value", function () {
                expect(result).toBe(true);
                expect(cpu.peek(cpu.rPC + 3)).toBe(22);
            });
        });

        describe("given compiler when immediate mode is specified with invalid value", function () {
            var result;

            beforeEach(function () {
                result = compiler.compile("LDA #$0AB");
            });

            it("then should not compile", function () {
                expect(result).toBe(false);
            });
        });
    });
})(Tests || (Tests = {}));
