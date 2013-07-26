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

        OpCodes.AddWithCarry = function (cpu, src) {
            var temp = src + cpu.rA + (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0);
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                if (((cpu.rA & 0xF) + (src & 0xF) + (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0)) > 9) {
                    temp += 6;
                }
                var overFlow = !(((cpu.rA ^ src) & 0x80) > 0) && ((cpu.rA ^ temp) & 0x80) > 0;
                cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, overFlow);
                if (temp > 0x99) {
                    temp += 96;
                }
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, (temp > 0x99));
            } else {
                var overFlow = !(((cpu.rA ^ src) & 0x80) > 0) && ((cpu.rA ^ temp) & 0x80) > 0;
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, (temp > Constants.Memory.ByteMask));
            }
            cpu.rA = temp & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rA);
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

    var AddWithCarryImmediate = (function () {
        function AddWithCarryImmediate() {
            this.opName = "ADC";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0x69;
        }
        AddWithCarryImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        AddWithCarryImmediate.prototype.execute = function (cpu) {
            OpCodes.AddWithCarry(cpu, cpu.addrPop());
        };
        return AddWithCarryImmediate;
    })();
    Emulator.AddWithCarryImmediate = AddWithCarryImmediate;

    registeredOperations.push(AddWithCarryImmediate);

    var AndImmediate = (function () {
        function AndImmediate() {
            this.opName = "AND";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0x29;
        }
        AndImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        AndImmediate.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.addrPop();
            cpu.setFlags(cpu.rA);
        };
        return AndImmediate;
    })();
    Emulator.AndImmediate = AndImmediate;

    registeredOperations.push(AndImmediate);

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

    var CompareYImmediate = (function () {
        function CompareYImmediate() {
            this.opName = "CPY";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xC0;
        }
        CompareYImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        CompareYImmediate.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rY, cpu.addrPop());
        };
        return CompareYImmediate;
    })();
    Emulator.CompareYImmediate = CompareYImmediate;

    registeredOperations.push(CompareYImmediate);

    var DecXSingle = (function () {
        function DecXSingle() {
            this.opName = "DEX";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xCA;
        }
        DecXSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        DecXSingle.prototype.execute = function (cpu) {
            cpu.rX -= 1;
            if (cpu.rX < 0) {
                cpu.rX = Constants.Memory.ByteMask;
            }
            cpu.setFlags(cpu.rX);
        };
        return DecXSingle;
    })();
    Emulator.DecXSingle = DecXSingle;

    registeredOperations.push(DecXSingle);

    var DecYSingle = (function () {
        function DecYSingle() {
            this.opName = "DEY";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0x88;
        }
        DecYSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        DecYSingle.prototype.execute = function (cpu) {
            cpu.rY -= 1;
            if (cpu.rY < 0) {
                cpu.rY = Constants.Memory.ByteMask;
            }
            cpu.setFlags(cpu.rY);
        };
        return DecYSingle;
    })();
    Emulator.DecYSingle = DecYSingle;

    registeredOperations.push(DecYSingle);

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

    var IncXSingle = (function () {
        function IncXSingle() {
            this.opName = "INX";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xe8;
        }
        IncXSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        IncXSingle.prototype.execute = function (cpu) {
            cpu.rX = ((cpu.rX) + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rX);
        };
        return IncXSingle;
    })();
    Emulator.IncXSingle = IncXSingle;

    registeredOperations.push(IncXSingle);

    var IncYSingle = (function () {
        function IncYSingle() {
            this.opName = "INY";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xC8;
        }
        IncYSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        IncYSingle.prototype.execute = function (cpu) {
            cpu.rY = ((cpu.rY) + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rY);
        };
        return IncYSingle;
    })();
    Emulator.IncYSingle = IncYSingle;

    registeredOperations.push(IncYSingle);

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

    var JmpIndirect = (function () {
        function JmpIndirect() {
            this.opName = "JMP";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeIndirect;
            this.opCode = 0x6c;
        }
        JmpIndirect.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "($" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ")");
        };

        JmpIndirect.prototype.execute = function (cpu) {
            var addressLocation = cpu.addrPopWord();
            var newAddress = cpu.peek(addressLocation) + (cpu.peek(addressLocation + 1) << Constants.Memory.BitsInByte);
            cpu.rPC = newAddress;
        };
        return JmpIndirect;
    })();
    Emulator.JmpIndirect = JmpIndirect;

    registeredOperations.push(JmpIndirect);

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

    var LoadAccumulatorZeroPage = (function () {
        function LoadAccumulatorZeroPage() {
            this.opName = "LDA";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeZeroPage;
            this.opCode = 0xa5;
        }
        LoadAccumulatorZeroPage.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToByte(bytes[1]));
        };

        LoadAccumulatorZeroPage.prototype.execute = function (cpu) {
            cpu.rA = cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        };
        return LoadAccumulatorZeroPage;
    })();
    Emulator.LoadAccumulatorZeroPage = LoadAccumulatorZeroPage;

    registeredOperations.push(LoadAccumulatorZeroPage);

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

    var StoreAccumulatorAbsoluteX = (function () {
        function StoreAccumulatorAbsoluteX() {
            this.opName = "STA";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsoluteX;
            this.opCode = 0x9d;
        }
        StoreAccumulatorAbsoluteX.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
        };

        StoreAccumulatorAbsoluteX.prototype.execute = function (cpu) {
            var targetAddress = cpu.addrPopWord() + cpu.rX;
            cpu.poke(targetAddress, cpu.rA);
        };
        return StoreAccumulatorAbsoluteX;
    })();
    Emulator.StoreAccumulatorAbsoluteX = StoreAccumulatorAbsoluteX;

    registeredOperations.push(StoreAccumulatorAbsoluteX);

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

    var TransferAccumulatorToXSingle = (function () {
        function TransferAccumulatorToXSingle() {
            this.opName = "TAX";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xAA;
        }
        TransferAccumulatorToXSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        TransferAccumulatorToXSingle.prototype.execute = function (cpu) {
            cpu.rX = cpu.rA;
            cpu.setFlags(cpu.rX);
        };
        return TransferAccumulatorToXSingle;
    })();
    Emulator.TransferAccumulatorToXSingle = TransferAccumulatorToXSingle;

    registeredOperations.push(TransferAccumulatorToXSingle);

    var TransferAccumulatorToYSingle = (function () {
        function TransferAccumulatorToYSingle() {
            this.opName = "TAY";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xA8;
        }
        TransferAccumulatorToYSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        TransferAccumulatorToYSingle.prototype.execute = function (cpu) {
            cpu.rY = cpu.rA;
            cpu.setFlags(cpu.rY);
        };
        return TransferAccumulatorToYSingle;
    })();
    Emulator.TransferAccumulatorToYSingle = TransferAccumulatorToYSingle;

    registeredOperations.push(TransferAccumulatorToYSingle);

    var TransferXToAccumulatorSingle = (function () {
        function TransferXToAccumulatorSingle() {
            this.opName = "TXA";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0x8A;
        }
        TransferXToAccumulatorSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        TransferXToAccumulatorSingle.prototype.execute = function (cpu) {
            cpu.rA = cpu.rX;
            cpu.setFlags(cpu.rA);
        };
        return TransferXToAccumulatorSingle;
    })();
    Emulator.TransferXToAccumulatorSingle = TransferXToAccumulatorSingle;

    registeredOperations.push(TransferXToAccumulatorSingle);

    var TransferYToAccumulatorSingle = (function () {
        function TransferYToAccumulatorSingle() {
            this.opName = "TYA";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0x98;
        }
        TransferYToAccumulatorSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        TransferYToAccumulatorSingle.prototype.execute = function (cpu) {
            cpu.rA = cpu.rY;
            cpu.setFlags(cpu.rA);
        };
        return TransferYToAccumulatorSingle;
    })();
    Emulator.TransferYToAccumulatorSingle = TransferYToAccumulatorSingle;

    registeredOperations.push(TransferYToAccumulatorSingle);
})(Emulator || (Emulator = {}));
