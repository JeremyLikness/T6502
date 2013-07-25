var Emulator;
(function (Emulator) {
    var registeredOperations = [];

    var OpCodes = (function () {
        function OpCodes() {
        }
        OpCodes.computeBranch = function (address, offset) {
            var result = 0;
            if (offset > Constants.Memory.BranchBack) {
                result = (address - (Constants.Memory.BranchOffset - offset));
            } else {
                result = address + offset;
            }
            return result;
        };

        OpCodes.LoadOpCodesByName = function (opCode) {
            var result = [];
            var idx;
            for (var idx = 0; idx < registeredOperations.length; idx++) {
                var operation = new registeredOperations[idx]();
                if (operation.opName === opCode) {
                    result.push(operation);
                }
            }
            return result;
        };

        OpCodes.ToByte = function (value) {
            var valueStr = value.toString(16).toUpperCase();
            return valueStr.length == 1 ? "0" + valueStr : valueStr;
        };

        OpCodes.ToWord = function (value) {
            var padding = ["000", "00", "0"];
            var valueStr = value.toString(16).toUpperCase();
            if (valueStr.length === 4) {
                return valueStr;
            } else {
                return padding[valueStr.length - 1] + valueStr;
            }
        };

        OpCodes.ToDecompiledLine = function (address, opCode, parm) {
            return "$" + address + ": " + opCode + " " + parm;
        };

        OpCodes.FillOps = function (operationMap) {
            var idx;
            var size = Constants.Memory.ByteMask + 1;
            while (size -= 1) {
                var invalid = new InvalidOp(size);
                operationMap.push(invalid);
            }

            for (idx = 0; idx < registeredOperations.length; idx++) {
                var operation = new registeredOperations[idx]();
                operationMap[operation.opCode] = operation;
            }
        };
        OpCodes.ModeImmediate = 1;
        OpCodes.ModeZeroPage = 2;
        OpCodes.ModeZeroPageX = 3;
        OpCodes.ModeZeroPageY = 4;
        OpCodes.ModeAbsolute = 5;
        OpCodes.ModeAbsoluteX = 6;
        OpCodes.ModeAbsoluteY = 7;
        OpCodes.ModeIndirect = 8;
        OpCodes.ModeIndexedIndirectX = 9;
        OpCodes.ModeIndexedIndirectY = 10;
        OpCodes.ModeSingle = 11;
        OpCodes.ModeRelative = 12;
        return OpCodes;
    })();
    Emulator.OpCodes = OpCodes;

    var BranchNotEqual = (function () {
        function BranchNotEqual() {
            this.opName = "BNE";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0xd0;
        }
        BranchNotEqual.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchNotEqual.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if ((cpu.rP & Constants.ProcessorStatus.ZeroFlagSet) === 0x0) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchNotEqual;
    })();
    Emulator.BranchNotEqual = BranchNotEqual;

    registeredOperations.push(BranchNotEqual);

    var CompareXImmediate = (function () {
        function CompareXImmediate() {
            this.opName = "CPX";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xe0;
        }
        CompareXImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        CompareXImmediate.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rX, cpu.addrPop());
        };
        return CompareXImmediate;
    })();
    Emulator.CompareXImmediate = CompareXImmediate;

    registeredOperations.push(CompareXImmediate);

    var ExclusiveOrIndirectX = (function () {
        function ExclusiveOrIndirectX() {
            this.opName = "EOR";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeIndexedIndirectX;
            this.opCode = 0x41;
        }
        ExclusiveOrIndirectX.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "($" + OpCodes.ToByte(bytes[1]) + ", X)");
        };

        ExclusiveOrIndirectX.prototype.execute = function (cpu) {
            var zeroPage = (cpu.addrPop() + cpu.rX) & Constants.Memory.ByteMask;
            var value = cpu.peek(zeroPage) + (cpu.peek(zeroPage + 1) << Constants.Memory.BitsInByte);
            cpu.rA ^= cpu.peek(value);
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrIndirectX;
    })();
    Emulator.ExclusiveOrIndirectX = ExclusiveOrIndirectX;

    registeredOperations.push(ExclusiveOrIndirectX);

    var InvalidOp = (function () {
        function InvalidOp(value) {
            this.opName = "???";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = value & Constants.Memory.ByteMask;
        }
        InvalidOp.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        InvalidOp.prototype.execute = function (cpu) {
            var prev = cpu.rPC - 1;
            var opCode = cpu.peek(prev);
            throw "Invalid op code 0x" + opCode.toString(16).toUpperCase() + " encountered at $" + prev.toString(16).toUpperCase();
        };
        return InvalidOp;
    })();
    Emulator.InvalidOp = InvalidOp;

    var IncAbsolute = (function () {
        function IncAbsolute() {
            this.opName = "INC";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0xee;
        }
        IncAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        IncAbsolute.prototype.execute = function (cpu) {
            var target = cpu.addrPopWord();
            var value = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        };
        return IncAbsolute;
    })();
    Emulator.IncAbsolute = IncAbsolute;

    registeredOperations.push(IncAbsolute);

    var IncAbsoluteX = (function () {
        function IncAbsoluteX() {
            this.opName = "INC";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsoluteX;
            this.opCode = 0xfe;
        }
        IncAbsoluteX.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
        };

        IncAbsoluteX.prototype.execute = function (cpu) {
            var target = cpu.addrPopWord() + cpu.rX;
            var value = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        };
        return IncAbsoluteX;
    })();
    Emulator.IncAbsoluteX = IncAbsoluteX;

    registeredOperations.push(IncAbsoluteX);

    var IncZeroPage = (function () {
        function IncZeroPage() {
            this.opName = "INC";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeZeroPage;
            this.opCode = 0xe6;
        }
        IncZeroPage.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToByte(bytes[1]));
        };

        IncZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            var value = cpu.peek(zeroPage);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(zeroPage, value);
            cpu.setFlags(value);
        };
        return IncZeroPage;
    })();
    Emulator.IncZeroPage = IncZeroPage;

    registeredOperations.push(IncZeroPage);

    var IncrementX = (function () {
        function IncrementX() {
            this.opName = "INX";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xe8;
        }
        IncrementX.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        IncrementX.prototype.execute = function (cpu) {
            cpu.rX = (cpu.rX + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rX);
        };
        return IncrementX;
    })();
    Emulator.IncrementX = IncrementX;

    registeredOperations.push(IncrementX);

    var JmpAbsolute = (function () {
        function JmpAbsolute() {
            this.opName = "JMP";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0x4c;
        }
        JmpAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        JmpAbsolute.prototype.execute = function (cpu) {
            var newAddress = cpu.addrPopWord();
            cpu.rPC = newAddress;
        };
        return JmpAbsolute;
    })();
    Emulator.JmpAbsolute = JmpAbsolute;

    registeredOperations.push(JmpAbsolute);

    var LoadAccumulatorImmediate = (function () {
        function LoadAccumulatorImmediate() {
            this.opName = "LDA";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xa9;
        }
        LoadAccumulatorImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        LoadAccumulatorImmediate.prototype.execute = function (cpu) {
            cpu.rA = cpu.addrPop();
            cpu.setFlags(cpu.rA);
        };
        return LoadAccumulatorImmediate;
    })();
    Emulator.LoadAccumulatorImmediate = LoadAccumulatorImmediate;

    registeredOperations.push(LoadAccumulatorImmediate);

    var LoadYRegisterImmediate = (function () {
        function LoadYRegisterImmediate() {
            this.opName = "LDY";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xa0;
        }
        LoadYRegisterImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        LoadYRegisterImmediate.prototype.execute = function (cpu) {
            cpu.rY = cpu.addrPop();
            cpu.setFlags(cpu.rY);
        };
        return LoadYRegisterImmediate;
    })();
    Emulator.LoadYRegisterImmediate = LoadYRegisterImmediate;

    registeredOperations.push(LoadYRegisterImmediate);

    var LoadXRegisterImmediate = (function () {
        function LoadXRegisterImmediate() {
            this.opName = "LDX";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xa2;
        }
        LoadXRegisterImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        LoadXRegisterImmediate.prototype.execute = function (cpu) {
            cpu.rX = cpu.addrPop();
            cpu.setFlags(cpu.rX);
        };
        return LoadXRegisterImmediate;
    })();
    Emulator.LoadXRegisterImmediate = LoadXRegisterImmediate;

    registeredOperations.push(LoadXRegisterImmediate);

    var LoadXRegisterZeroPage = (function () {
        function LoadXRegisterZeroPage() {
            this.opName = "LDX";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeZeroPage;
            this.opCode = 0xa6;
        }
        LoadXRegisterZeroPage.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToByte(bytes[1]));
        };

        LoadXRegisterZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            cpu.rX = cpu.peek(zeroPage);
            cpu.setFlags(cpu.rX);
        };
        return LoadXRegisterZeroPage;
    })();
    Emulator.LoadXRegisterZeroPage = LoadXRegisterZeroPage;

    registeredOperations.push(LoadXRegisterZeroPage);

    var RtsSingle = (function () {
        function RtsSingle() {
            this.opName = "RTS";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0x60;
        }
        RtsSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        RtsSingle.prototype.execute = function (cpu) {
            cpu.stackRts();
        };
        return RtsSingle;
    })();
    Emulator.RtsSingle = RtsSingle;

    registeredOperations.push(RtsSingle);

    var StoreAccumulatorAbsolute = (function () {
        function StoreAccumulatorAbsolute() {
            this.opName = "STA";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0x8d;
        }
        StoreAccumulatorAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        StoreAccumulatorAbsolute.prototype.execute = function (cpu) {
            var targetAddress = cpu.addrPopWord();
            cpu.poke(targetAddress, cpu.rA);
        };
        return StoreAccumulatorAbsolute;
    })();
    Emulator.StoreAccumulatorAbsolute = StoreAccumulatorAbsolute;

    registeredOperations.push(StoreAccumulatorAbsolute);

    var StoreAccumulatorAbsoluteY = (function () {
        function StoreAccumulatorAbsoluteY() {
            this.opName = "STA";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsoluteY;
            this.opCode = 0x99;
        }
        StoreAccumulatorAbsoluteY.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", Y");
        };

        StoreAccumulatorAbsoluteY.prototype.execute = function (cpu) {
            var targetAddress = cpu.addrPopWord() + cpu.rY;
            cpu.poke(targetAddress, cpu.rA);
        };
        return StoreAccumulatorAbsoluteY;
    })();
    Emulator.StoreAccumulatorAbsoluteY = StoreAccumulatorAbsoluteY;

    registeredOperations.push(StoreAccumulatorAbsoluteY);

    var StoreAccumulatorIndirectY = (function () {
        function StoreAccumulatorIndirectY() {
            this.opName = "STA";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeIndexedIndirectY;
            this.opCode = 0x91;
        }
        StoreAccumulatorIndirectY.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "($" + OpCodes.ToByte(bytes[1]) + "), Y");
        };

        StoreAccumulatorIndirectY.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            var target = cpu.peek(zeroPage) + (cpu.peek(zeroPage + 1) << Constants.Memory.BitsInByte) + cpu.rY;
            cpu.poke(target, cpu.rA);
        };
        return StoreAccumulatorIndirectY;
    })();
    Emulator.StoreAccumulatorIndirectY = StoreAccumulatorIndirectY;

    registeredOperations.push(StoreAccumulatorIndirectY);

    var StoreAccumulatorZeroPage = (function () {
        function StoreAccumulatorZeroPage() {
            this.opName = "STA";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeZeroPage;
            this.opCode = 0x85;
        }
        StoreAccumulatorZeroPage.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToByte(bytes[1]));
        };

        StoreAccumulatorZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            cpu.poke(zeroPage, cpu.rA);
        };
        return StoreAccumulatorZeroPage;
    })();
    Emulator.StoreAccumulatorZeroPage = StoreAccumulatorZeroPage;

    registeredOperations.push(StoreAccumulatorZeroPage);
})(Emulator || (Emulator = {}));
