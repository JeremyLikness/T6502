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

        OpCodes.SubtractWithCarry = function (cpu, src) {
            var temp = cpu.rA - src - (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 0 : 1);
            cpu.setFlags(temp);
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, (((cpu.rA ^ temp) & 0x80) > 0) && (((cpu.rA ^ src) & 0x80) > 0));
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                if (((cpu.rA & 0xF) - (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 0 : 1)) < (src & 0x0F)) {
                    temp -= 6;
                }
                if (temp > 0x99) {
                    temp -= 0x60;
                }
            }
            cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, (temp < 0x100));
            cpu.rA = temp & Constants.Memory.ByteMask;
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

    var AddWithCarryAbsolute = (function () {
        function AddWithCarryAbsolute() {
            this.opName = "ADC";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0x6d;
        }
        AddWithCarryAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        AddWithCarryAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            OpCodes.AddWithCarry(cpu, targetValue);
        };
        return AddWithCarryAbsolute;
    })();
    Emulator.AddWithCarryAbsolute = AddWithCarryAbsolute;

    registeredOperations.push(AddWithCarryAbsolute);

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

    var BranchNotEqualRelative = (function () {
        function BranchNotEqualRelative() {
            this.opName = "BNE";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0xd0;
        }
        BranchNotEqualRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchNotEqualRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchNotEqualRelative;
    })();
    Emulator.BranchNotEqualRelative = BranchNotEqualRelative;

    registeredOperations.push(BranchNotEqualRelative);

    var BranchEqualRelative = (function () {
        function BranchEqualRelative() {
            this.opName = "BEQ";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0xf0;
        }
        BranchEqualRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchEqualRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchEqualRelative;
    })();
    Emulator.BranchEqualRelative = BranchEqualRelative;

    registeredOperations.push(BranchEqualRelative);

    var BranchMinusRelative = (function () {
        function BranchMinusRelative() {
            this.opName = "BMI";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0x30;
        }
        BranchMinusRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchMinusRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchMinusRelative;
    })();
    Emulator.BranchMinusRelative = BranchMinusRelative;

    registeredOperations.push(BranchMinusRelative);

    var BranchPlusRelative = (function () {
        function BranchPlusRelative() {
            this.opName = "BPL";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0x10;
        }
        BranchPlusRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchPlusRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchPlusRelative;
    })();
    Emulator.BranchPlusRelative = BranchPlusRelative;

    registeredOperations.push(BranchPlusRelative);

    var BranchOverflowClearRelative = (function () {
        function BranchOverflowClearRelative() {
            this.opName = "BVC";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0x50;
        }
        BranchOverflowClearRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchOverflowClearRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchOverflowClearRelative;
    })();
    Emulator.BranchOverflowClearRelative = BranchOverflowClearRelative;

    registeredOperations.push(BranchOverflowClearRelative);

    var BranchOverflowSetRelative = (function () {
        function BranchOverflowSetRelative() {
            this.opName = "BVS";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0x70;
        }
        BranchOverflowSetRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchOverflowSetRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchOverflowSetRelative;
    })();
    Emulator.BranchOverflowSetRelative = BranchOverflowSetRelative;

    registeredOperations.push(BranchOverflowSetRelative);

    var BranchCarryClearRelative = (function () {
        function BranchCarryClearRelative() {
            this.opName = "BCC";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0x90;
        }
        BranchCarryClearRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchCarryClearRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchCarryClearRelative;
    })();
    Emulator.BranchCarryClearRelative = BranchCarryClearRelative;

    registeredOperations.push(BranchCarryClearRelative);

    var BranchCarrySetRelative = (function () {
        function BranchCarrySetRelative() {
            this.opName = "BCS";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeRelative;
            this.opCode = 0xB0;
        }
        BranchCarrySetRelative.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        };

        BranchCarrySetRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchCarrySetRelative;
    })();
    Emulator.BranchCarrySetRelative = BranchCarrySetRelative;

    registeredOperations.push(BranchCarrySetRelative);

    var ClearDecimalSingle = (function () {
        function ClearDecimalSingle() {
            this.opName = "CLD";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0xD8;
        }
        ClearDecimalSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        ClearDecimalSingle.prototype.execute = function (cpu) {
            cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
        };
        return ClearDecimalSingle;
    })();
    Emulator.ClearDecimalSingle = ClearDecimalSingle;

    registeredOperations.push(ClearDecimalSingle);

    var CompareAccumulatorImmediate = (function () {
        function CompareAccumulatorImmediate() {
            this.opName = "CMP";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xc9;
        }
        CompareAccumulatorImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        CompareAccumulatorImmediate.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rA, cpu.addrPop());
        };
        return CompareAccumulatorImmediate;
    })();
    Emulator.CompareAccumulatorImmediate = CompareAccumulatorImmediate;

    registeredOperations.push(CompareAccumulatorImmediate);

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
            cpu.rA ^= cpu.peek(cpu.addrIndexedIndirectX());
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
            var target = cpu.addrAbsoluteX();
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
            cpu.rPC = cpu.addrIndirect();
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

    var JmpSubroutineAbsolute = (function () {
        function JmpSubroutineAbsolute() {
            this.opName = "JSR";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0x20;
        }
        JmpSubroutineAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        JmpSubroutineAbsolute.prototype.execute = function (cpu) {
            var newAddress = cpu.addrPopWord();
            cpu.stackPush(((cpu.rPC - 1) >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
            cpu.stackPush((cpu.rPC - 1) & (Constants.Memory.ByteMask));
            cpu.rPC = newAddress;
        };
        return JmpSubroutineAbsolute;
    })();
    Emulator.JmpSubroutineAbsolute = JmpSubroutineAbsolute;

    registeredOperations.push(JmpSubroutineAbsolute);

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

    var LoadAccumulatorAbsolute = (function () {
        function LoadAccumulatorAbsolute() {
            this.opName = "LDA";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0xad;
        }
        LoadAccumulatorAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        LoadAccumulatorAbsolute.prototype.execute = function (cpu) {
            var memory = cpu.addrPopWord();
            cpu.rA = cpu.peek(memory);
            cpu.setFlags(cpu.rA);
        };
        return LoadAccumulatorAbsolute;
    })();
    Emulator.LoadAccumulatorAbsolute = LoadAccumulatorAbsolute;

    registeredOperations.push(LoadAccumulatorAbsolute);

    var LoadAccumulatorAbsoluteX = (function () {
        function LoadAccumulatorAbsoluteX() {
            this.opName = "LDA";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsoluteX;
            this.opCode = 0xbd;
        }
        LoadAccumulatorAbsoluteX.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
        };

        LoadAccumulatorAbsoluteX.prototype.execute = function (cpu) {
            cpu.rA = cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        };
        return LoadAccumulatorAbsoluteX;
    })();
    Emulator.LoadAccumulatorAbsoluteX = LoadAccumulatorAbsoluteX;

    registeredOperations.push(LoadAccumulatorAbsoluteX);

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

    var LoadYRegisterAbsolute = (function () {
        function LoadYRegisterAbsolute() {
            this.opName = "LDY";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0xac;
        }
        LoadYRegisterAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        LoadYRegisterAbsolute.prototype.execute = function (cpu) {
            var target = cpu.addrPopWord();
            cpu.rY = cpu.peek(target);
            cpu.setFlags(cpu.rY);
        };
        return LoadYRegisterAbsolute;
    })();
    Emulator.LoadYRegisterAbsolute = LoadYRegisterAbsolute;

    registeredOperations.push(LoadYRegisterAbsolute);

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

    var PullAccumulatorSingle = (function () {
        function PullAccumulatorSingle() {
            this.opName = "PLA";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0x68;
        }
        PullAccumulatorSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        PullAccumulatorSingle.prototype.execute = function (cpu) {
            cpu.rA = cpu.stackPop();
        };
        return PullAccumulatorSingle;
    })();
    Emulator.PullAccumulatorSingle = PullAccumulatorSingle;

    registeredOperations.push(PullAccumulatorSingle);

    var PushAccumulatorSingle = (function () {
        function PushAccumulatorSingle() {
            this.opName = "PHA";
            this.sizeBytes = 0x01;
            this.addressingMode = OpCodes.ModeSingle;
            this.opCode = 0x48;
        }
        PushAccumulatorSingle.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "");
        };

        PushAccumulatorSingle.prototype.execute = function (cpu) {
            cpu.stackPush(cpu.rA);
        };
        return PushAccumulatorSingle;
    })();
    Emulator.PushAccumulatorSingle = PushAccumulatorSingle;

    registeredOperations.push(PushAccumulatorSingle);

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
            cpu.poke(cpu.addrAbsoluteX(), cpu.rA);
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
            cpu.poke(cpu.addrAbsoluteY(), cpu.rA);
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
            cpu.poke(cpu.addrIndirectIndexedY(), cpu.rA);
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

    var SubtractWithCarryImmediate = (function () {
        function SubtractWithCarryImmediate() {
            this.opName = "SBC";
            this.sizeBytes = 0x02;
            this.addressingMode = OpCodes.ModeImmediate;
            this.opCode = 0xe9;
        }
        SubtractWithCarryImmediate.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "#$" + OpCodes.ToByte(bytes[1]));
        };

        SubtractWithCarryImmediate.prototype.execute = function (cpu) {
            OpCodes.SubtractWithCarry(cpu, cpu.addrPop());
        };
        return SubtractWithCarryImmediate;
    })();
    Emulator.SubtractWithCarryImmediate = SubtractWithCarryImmediate;

    registeredOperations.push(SubtractWithCarryImmediate);

    var SubtractWithCarryAbsolute = (function () {
        function SubtractWithCarryAbsolute() {
            this.opName = "SBC";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0xed;
        }
        SubtractWithCarryAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        SubtractWithCarryAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        };
        return SubtractWithCarryAbsolute;
    })();
    Emulator.SubtractWithCarryAbsolute = SubtractWithCarryAbsolute;

    registeredOperations.push(SubtractWithCarryAbsolute);

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
