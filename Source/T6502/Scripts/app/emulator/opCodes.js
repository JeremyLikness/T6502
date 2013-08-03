var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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

        OpCodes.ProcessLine = function (address, op, bytes) {
            if (op.addressingMode === OpCodes.ModeImmediate) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "#$" + OpCodes.ToByte(bytes[1]));
            }

            if (op.addressingMode === OpCodes.ModeZeroPage) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "$" + OpCodes.ToByte(bytes[1]));
            }

            if (op.addressingMode === OpCodes.ModeZeroPageX) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "$" + OpCodes.ToByte(bytes[1]) + ",X");
            }

            if (op.addressingMode === OpCodes.ModeAbsolute) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
            }

            if (op.addressingMode === OpCodes.ModeAbsoluteX) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
            }

            if (op.addressingMode === OpCodes.ModeAbsoluteY) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", Y");
            }

            if (op.addressingMode === OpCodes.ModeRelative) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
            }

            if (op.addressingMode === OpCodes.ModeSingle) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "");
            }

            if (op.addressingMode === OpCodes.ModeIndexedIndirectX) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "($" + OpCodes.ToByte(bytes[1]) + ", X)");
            }

            if (op.addressingMode === OpCodes.ModeIndexedIndirectY) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "($" + OpCodes.ToByte(bytes[1]) + "), Y");
            }

            if (op.addressingMode === OpCodes.ModeIndirect) {
                return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), op.opName, "($" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ")");
            }

            throw "Unknown addressing mode.";
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
            var temp;
            var carryFactor = cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0;
            var overflowFlag;

            function offsetAdjustAdd(offs, cutOff) {
                if (offs >= cutOff) {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offs >= 0x180) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
                    }
                    return true;
                } else {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offs < Constants.ProcessorStatus.NegativeFlagSet) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
                    }
                    return false;
                }
            }

            overflowFlag = !((cpu.rA ^ src) & Constants.ProcessorStatus.NegativeFlagSet);
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, overflowFlag);
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                temp = (cpu.rA & Constants.Memory.NibbleMask) + (src & Constants.Memory.NibbleMask) + carryFactor;
                if (temp >= 0x0A) {
                    temp = 0x10 | ((temp + 0x06) & Constants.Memory.NibbleMask);
                }
                temp += (cpu.rA & Constants.Memory.HighNibbleMask) + (src & Constants.Memory.HighNibbleMask);
                if (offsetAdjustAdd(temp, 0xA0)) {
                    temp += 0x60;
                }
            } else {
                temp = cpu.rA + src + carryFactor;
                offsetAdjustAdd(temp, 0x100);
            }
            cpu.rA = temp & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rA);
        };

        OpCodes.SubtractWithCarry = function (cpu, src) {
            var temp, offset, carryFactor;
            var overflowFlag;

            function offsetAdjustSub(offs) {
                if (offs < 0x100) {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offs < Constants.ProcessorStatus.NegativeFlagSet) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
                    }
                    return true;
                } else {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offset >= 0x180) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
                    }
                    return false;
                }
            }
            ;

            carryFactor = cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0;

            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, !!((cpu.rA ^ src) & Constants.ProcessorStatus.NegativeFlagSet));
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                temp = Constants.Memory.NibbleMask + (cpu.rA & Constants.Memory.NibbleMask) - (src & Constants.Memory.NibbleMask) + carryFactor;
                if (temp < 0x10) {
                    offset = 0;
                    temp -= 0x06;
                } else {
                    offset = 0x10;
                    temp -= 0x10;
                }
                offset += Constants.Memory.HighNibbleMask + (cpu.rA & Constants.Memory.HighNibbleMask) - (src & Constants.Memory.HighNibbleMask);
                if (offsetAdjustSub(offset)) {
                    offset -= 0x60;
                }
                offset += temp;
            } else {
                offset = Constants.Memory.ByteMask + cpu.rA - src + carryFactor;
                offsetAdjustSub(offset);
            }
            cpu.rA = offset & Constants.Memory.ByteMask;
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

    var BaseOpCode = (function () {
        function BaseOpCode(opName, sizeBytes, addressingMode, opCode) {
            this.opName = opName;
            this.sizeBytes = sizeBytes;
            this.addressingMode = addressingMode;
            this.opCode = opCode;
        }
        BaseOpCode.prototype.decompile = function (address, bytes) {
            return OpCodes.ProcessLine(address, this, bytes);
        };

        BaseOpCode.prototype.execute = function (cpu) {
            return;
        };
        return BaseOpCode;
    })();
    Emulator.BaseOpCode = BaseOpCode;

    var AddWithCarryImmediate = (function (_super) {
        __extends(AddWithCarryImmediate, _super);
        function AddWithCarryImmediate() {
            _super.call(this, "ADC", 0x02, OpCodes.ModeImmediate, 0x69);
        }
        AddWithCarryImmediate.prototype.execute = function (cpu) {
            OpCodes.AddWithCarry(cpu, cpu.addrPop());
        };
        return AddWithCarryImmediate;
    })(BaseOpCode);
    Emulator.AddWithCarryImmediate = AddWithCarryImmediate;
    registeredOperations.push(AddWithCarryImmediate);

    var AddWithCarryZeroPage = (function (_super) {
        __extends(AddWithCarryZeroPage, _super);
        function AddWithCarryZeroPage() {
            _super.call(this, "ADC", 0x02, OpCodes.ModeZeroPage, 0x65);
        }
        AddWithCarryZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            OpCodes.AddWithCarry(cpu, cpu.peek(zeroPage));
        };
        return AddWithCarryZeroPage;
    })(BaseOpCode);
    Emulator.AddWithCarryZeroPage = AddWithCarryZeroPage;
    registeredOperations.push(AddWithCarryZeroPage);

    var AddWithCarryZeroPageX = (function (_super) {
        __extends(AddWithCarryZeroPageX, _super);
        function AddWithCarryZeroPageX() {
            _super.call(this, "ADC", 0x02, OpCodes.ModeZeroPageX, 0x75);
        }
        AddWithCarryZeroPageX.prototype.execute = function (cpu) {
            OpCodes.AddWithCarry(cpu, cpu.peek(cpu.addrZeroPageX()));
        };
        return AddWithCarryZeroPageX;
    })(BaseOpCode);
    Emulator.AddWithCarryZeroPageX = AddWithCarryZeroPageX;
    registeredOperations.push(AddWithCarryZeroPageX);

    var AddWithCarryAbsolute = (function (_super) {
        __extends(AddWithCarryAbsolute, _super);
        function AddWithCarryAbsolute() {
            _super.call(this, "ADC", 0x03, OpCodes.ModeAbsolute, 0x6D);
        }
        AddWithCarryAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            OpCodes.AddWithCarry(cpu, targetValue);
        };
        return AddWithCarryAbsolute;
    })(BaseOpCode);
    Emulator.AddWithCarryAbsolute = AddWithCarryAbsolute;
    registeredOperations.push(AddWithCarryAbsolute);

    var AddWithCarryAbsoluteX = (function (_super) {
        __extends(AddWithCarryAbsoluteX, _super);
        function AddWithCarryAbsoluteX() {
            _super.call(this, "ADC", 0x03, OpCodes.ModeAbsoluteX, 0x7D);
        }
        AddWithCarryAbsoluteX.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrAbsoluteX());
            OpCodes.AddWithCarry(cpu, targetValue);
        };
        return AddWithCarryAbsoluteX;
    })(BaseOpCode);
    Emulator.AddWithCarryAbsoluteX = AddWithCarryAbsoluteX;
    registeredOperations.push(AddWithCarryAbsoluteX);

    var AddWithCarryAbsoluteY = (function (_super) {
        __extends(AddWithCarryAbsoluteY, _super);
        function AddWithCarryAbsoluteY() {
            _super.call(this, "ADC", 0x03, OpCodes.ModeAbsoluteY, 0x79);
        }
        AddWithCarryAbsoluteY.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrAbsoluteY());
            OpCodes.AddWithCarry(cpu, targetValue);
        };
        return AddWithCarryAbsoluteY;
    })(BaseOpCode);
    Emulator.AddWithCarryAbsoluteY = AddWithCarryAbsoluteY;
    registeredOperations.push(AddWithCarryAbsoluteY);

    var AddWithCarryIndexedIndirectX = (function (_super) {
        __extends(AddWithCarryIndexedIndirectX, _super);
        function AddWithCarryIndexedIndirectX() {
            _super.call(this, "ADC", 0x02, OpCodes.ModeIndexedIndirectX, 0x61);
        }
        AddWithCarryIndexedIndirectX.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrIndexedIndirectX());
            OpCodes.AddWithCarry(cpu, targetValue);
        };
        return AddWithCarryIndexedIndirectX;
    })(BaseOpCode);
    Emulator.AddWithCarryIndexedIndirectX = AddWithCarryIndexedIndirectX;
    registeredOperations.push(AddWithCarryIndexedIndirectX);

    var AddWithCarryIndirectIndexedY = (function (_super) {
        __extends(AddWithCarryIndirectIndexedY, _super);
        function AddWithCarryIndirectIndexedY() {
            _super.call(this, "ADC", 0x02, OpCodes.ModeIndexedIndirectY, 0x71);
        }
        AddWithCarryIndirectIndexedY.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrIndirectIndexedY());
            OpCodes.AddWithCarry(cpu, targetValue);
        };
        return AddWithCarryIndirectIndexedY;
    })(BaseOpCode);
    Emulator.AddWithCarryIndirectIndexedY = AddWithCarryIndirectIndexedY;
    registeredOperations.push(AddWithCarryIndirectIndexedY);

    var AndImmediate = (function (_super) {
        __extends(AndImmediate, _super);
        function AndImmediate() {
            _super.call(this, "AND", 0x02, OpCodes.ModeImmediate, 0x29);
        }
        AndImmediate.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.addrPop();
            cpu.setFlags(cpu.rA);
        };
        return AndImmediate;
    })(BaseOpCode);
    Emulator.AndImmediate = AndImmediate;
    registeredOperations.push(AndImmediate);

    var AndZeroPage = (function (_super) {
        __extends(AndZeroPage, _super);
        function AndZeroPage() {
            _super.call(this, "AND", 0x02, OpCodes.ModeZeroPage, 0x25);
        }
        AndZeroPage.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        };
        return AndZeroPage;
    })(BaseOpCode);
    Emulator.AndZeroPage = AndZeroPage;
    registeredOperations.push(AndZeroPage);

    var AndZeroPageX = (function (_super) {
        __extends(AndZeroPageX, _super);
        function AndZeroPageX() {
            _super.call(this, "AND", 0x02, OpCodes.ModeZeroPageX, 0x35);
        }
        AndZeroPageX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrZeroPageX());
            cpu.setFlags(cpu.rA);
        };
        return AndZeroPageX;
    })(BaseOpCode);
    Emulator.AndZeroPageX = AndZeroPageX;
    registeredOperations.push(AndZeroPageX);

    var AndAbsolute = (function (_super) {
        __extends(AndAbsolute, _super);
        function AndAbsolute() {
            _super.call(this, "AND", 0x03, OpCodes.ModeAbsolute, 0x2D);
        }
        AndAbsolute.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrPopWord());
            cpu.setFlags(cpu.rA);
        };
        return AndAbsolute;
    })(BaseOpCode);
    Emulator.AndAbsolute = AndAbsolute;
    registeredOperations.push(AndAbsolute);

    var AndAbsoluteX = (function (_super) {
        __extends(AndAbsoluteX, _super);
        function AndAbsoluteX() {
            _super.call(this, "AND", 0x03, OpCodes.ModeAbsoluteX, 0x3D);
        }
        AndAbsoluteX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        };
        return AndAbsoluteX;
    })(BaseOpCode);
    Emulator.AndAbsoluteX = AndAbsoluteX;
    registeredOperations.push(AndAbsoluteX);

    var AndAbsoluteY = (function (_super) {
        __extends(AndAbsoluteY, _super);
        function AndAbsoluteY() {
            _super.call(this, "AND", 0x03, OpCodes.ModeAbsoluteY, 0x39);
        }
        AndAbsoluteY.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrAbsoluteY());
            cpu.setFlags(cpu.rA);
        };
        return AndAbsoluteY;
    })(BaseOpCode);
    Emulator.AndAbsoluteY = AndAbsoluteY;
    registeredOperations.push(AndAbsoluteY);

    var AndIndirectX = (function (_super) {
        __extends(AndIndirectX, _super);
        function AndIndirectX() {
            _super.call(this, "AND", 0x02, OpCodes.ModeIndexedIndirectX, 0x21);
        }
        AndIndirectX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        };
        return AndIndirectX;
    })(BaseOpCode);
    Emulator.AndIndirectX = AndIndirectX;
    registeredOperations.push(AndIndirectX);

    var AndIndirectY = (function (_super) {
        __extends(AndIndirectY, _super);
        function AndIndirectY() {
            _super.call(this, "AND", 0x02, OpCodes.ModeIndexedIndirectY, 0x31);
        }
        AndIndirectY.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        };
        return AndIndirectY;
    })(BaseOpCode);
    Emulator.AndIndirectY = AndIndirectY;
    registeredOperations.push(AndIndirectY);

    var BranchNotEqualRelative = (function (_super) {
        __extends(BranchNotEqualRelative, _super);
        function BranchNotEqualRelative() {
            _super.call(this, "BNE", 0x02, OpCodes.ModeRelative, 0xD0);
        }
        BranchNotEqualRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchNotEqualRelative;
    })(BaseOpCode);
    Emulator.BranchNotEqualRelative = BranchNotEqualRelative;
    registeredOperations.push(BranchNotEqualRelative);

    var BranchEqualRelative = (function (_super) {
        __extends(BranchEqualRelative, _super);
        function BranchEqualRelative() {
            _super.call(this, "BEQ", 0x02, OpCodes.ModeRelative, 0xF0);
        }
        BranchEqualRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchEqualRelative;
    })(BaseOpCode);
    Emulator.BranchEqualRelative = BranchEqualRelative;
    registeredOperations.push(BranchEqualRelative);

    var BranchMinusRelative = (function (_super) {
        __extends(BranchMinusRelative, _super);
        function BranchMinusRelative() {
            _super.call(this, "BMI", 0x02, OpCodes.ModeRelative, 0x30);
        }
        BranchMinusRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchMinusRelative;
    })(BaseOpCode);
    Emulator.BranchMinusRelative = BranchMinusRelative;
    registeredOperations.push(BranchMinusRelative);

    var BranchPlusRelative = (function (_super) {
        __extends(BranchPlusRelative, _super);
        function BranchPlusRelative() {
            _super.call(this, "BPL", 0x02, OpCodes.ModeRelative, 0x10);
        }
        BranchPlusRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchPlusRelative;
    })(BaseOpCode);
    Emulator.BranchPlusRelative = BranchPlusRelative;
    registeredOperations.push(BranchPlusRelative);

    var BranchOverflowClearRelative = (function (_super) {
        __extends(BranchOverflowClearRelative, _super);
        function BranchOverflowClearRelative() {
            _super.call(this, "BVC", 0x02, OpCodes.ModeRelative, 0x50);
        }
        BranchOverflowClearRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchOverflowClearRelative;
    })(BaseOpCode);
    Emulator.BranchOverflowClearRelative = BranchOverflowClearRelative;
    registeredOperations.push(BranchOverflowClearRelative);

    var BranchOverflowSetRelative = (function (_super) {
        __extends(BranchOverflowSetRelative, _super);
        function BranchOverflowSetRelative() {
            _super.call(this, "BVS", 0x02, OpCodes.ModeRelative, 0x70);
        }
        BranchOverflowSetRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchOverflowSetRelative;
    })(BaseOpCode);
    Emulator.BranchOverflowSetRelative = BranchOverflowSetRelative;
    registeredOperations.push(BranchOverflowSetRelative);

    var BranchCarryClearRelative = (function (_super) {
        __extends(BranchCarryClearRelative, _super);
        function BranchCarryClearRelative() {
            _super.call(this, "BCC", 0x02, OpCodes.ModeRelative, 0x90);
        }
        BranchCarryClearRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchCarryClearRelative;
    })(BaseOpCode);
    Emulator.BranchCarryClearRelative = BranchCarryClearRelative;
    registeredOperations.push(BranchCarryClearRelative);

    var BranchCarrySetRelative = (function (_super) {
        __extends(BranchCarrySetRelative, _super);
        function BranchCarrySetRelative() {
            _super.call(this, "BCS", 0x02, OpCodes.ModeRelative, 0xB0);
        }
        BranchCarrySetRelative.prototype.execute = function (cpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        };
        return BranchCarrySetRelative;
    })(BaseOpCode);
    Emulator.BranchCarrySetRelative = BranchCarrySetRelative;
    registeredOperations.push(BranchCarrySetRelative);

    var CompareAccumulatorImmediate = (function (_super) {
        __extends(CompareAccumulatorImmediate, _super);
        function CompareAccumulatorImmediate() {
            _super.call(this, "CMP", 0x02, OpCodes.ModeImmediate, 0xC9);
        }
        CompareAccumulatorImmediate.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rA, cpu.addrPop());
        };
        return CompareAccumulatorImmediate;
    })(BaseOpCode);
    Emulator.CompareAccumulatorImmediate = CompareAccumulatorImmediate;
    registeredOperations.push(CompareAccumulatorImmediate);

    var CompareAccumulatorZeroPage = (function (_super) {
        __extends(CompareAccumulatorZeroPage, _super);
        function CompareAccumulatorZeroPage() {
            _super.call(this, "CMP", 0x02, OpCodes.ModeZeroPage, 0xC5);
        }
        CompareAccumulatorZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            cpu.compareWithFlags(cpu.rA, cpu.peek(zeroPage));
        };
        return CompareAccumulatorZeroPage;
    })(BaseOpCode);
    Emulator.CompareAccumulatorZeroPage = CompareAccumulatorZeroPage;
    registeredOperations.push(CompareAccumulatorZeroPage);

    var CompareAccumulatorZeroPageX = (function (_super) {
        __extends(CompareAccumulatorZeroPageX, _super);
        function CompareAccumulatorZeroPageX() {
            _super.call(this, "CMP", 0x02, OpCodes.ModeZeroPageX, 0xD5);
        }
        CompareAccumulatorZeroPageX.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rA, cpu.peek(cpu.addrZeroPageX()));
        };
        return CompareAccumulatorZeroPageX;
    })(BaseOpCode);
    Emulator.CompareAccumulatorZeroPageX = CompareAccumulatorZeroPageX;
    registeredOperations.push(CompareAccumulatorZeroPageX);

    var CompareAccumulatorAbsolute = (function (_super) {
        __extends(CompareAccumulatorAbsolute, _super);
        function CompareAccumulatorAbsolute() {
            _super.call(this, "CMP", 0x03, OpCodes.ModeAbsolute, 0xCD);
        }
        CompareAccumulatorAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            cpu.compareWithFlags(cpu.rA, targetValue);
        };
        return CompareAccumulatorAbsolute;
    })(BaseOpCode);
    Emulator.CompareAccumulatorAbsolute = CompareAccumulatorAbsolute;
    registeredOperations.push(CompareAccumulatorAbsolute);

    var CompareAccumulatorAbsoluteX = (function (_super) {
        __extends(CompareAccumulatorAbsoluteX, _super);
        function CompareAccumulatorAbsoluteX() {
            _super.call(this, "CMP", 0x03, OpCodes.ModeAbsoluteX, 0xDD);
        }
        CompareAccumulatorAbsoluteX.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrAbsoluteX());
            cpu.compareWithFlags(cpu.rA, targetValue);
        };
        return CompareAccumulatorAbsoluteX;
    })(BaseOpCode);
    Emulator.CompareAccumulatorAbsoluteX = CompareAccumulatorAbsoluteX;
    registeredOperations.push(CompareAccumulatorAbsoluteX);

    var CompareAccumulatorAbsoluteY = (function (_super) {
        __extends(CompareAccumulatorAbsoluteY, _super);
        function CompareAccumulatorAbsoluteY() {
            _super.call(this, "CMP", 0x03, OpCodes.ModeAbsoluteY, 0xD9);
        }
        CompareAccumulatorAbsoluteY.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrAbsoluteY());
            cpu.compareWithFlags(cpu.rA, targetValue);
        };
        return CompareAccumulatorAbsoluteY;
    })(BaseOpCode);
    Emulator.CompareAccumulatorAbsoluteY = CompareAccumulatorAbsoluteY;
    registeredOperations.push(CompareAccumulatorAbsoluteY);

    var CompareAccumulatorIndexedIndirectX = (function (_super) {
        __extends(CompareAccumulatorIndexedIndirectX, _super);
        function CompareAccumulatorIndexedIndirectX() {
            _super.call(this, "CMP", 0x02, OpCodes.ModeIndexedIndirectX, 0xC1);
        }
        CompareAccumulatorIndexedIndirectX.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrIndexedIndirectX());
            cpu.compareWithFlags(cpu.rA, targetValue);
        };
        return CompareAccumulatorIndexedIndirectX;
    })(BaseOpCode);
    Emulator.CompareAccumulatorIndexedIndirectX = CompareAccumulatorIndexedIndirectX;
    registeredOperations.push(CompareAccumulatorIndexedIndirectX);

    var CompareAccumulatorIndirectIndexedY = (function (_super) {
        __extends(CompareAccumulatorIndirectIndexedY, _super);
        function CompareAccumulatorIndirectIndexedY() {
            _super.call(this, "CMP", 0x02, OpCodes.ModeIndexedIndirectY, 0xD1);
        }
        CompareAccumulatorIndirectIndexedY.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrIndirectIndexedY());
            cpu.compareWithFlags(cpu.rA, targetValue);
        };
        return CompareAccumulatorIndirectIndexedY;
    })(BaseOpCode);
    Emulator.CompareAccumulatorIndirectIndexedY = CompareAccumulatorIndirectIndexedY;
    registeredOperations.push(CompareAccumulatorIndirectIndexedY);

    var CompareXImmediate = (function (_super) {
        __extends(CompareXImmediate, _super);
        function CompareXImmediate() {
            _super.call(this, "CPX", 0x02, OpCodes.ModeImmediate, 0xE0);
        }
        CompareXImmediate.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rX, cpu.addrPop());
        };
        return CompareXImmediate;
    })(BaseOpCode);
    Emulator.CompareXImmediate = CompareXImmediate;
    registeredOperations.push(CompareXImmediate);

    var CompareXZeroPage = (function (_super) {
        __extends(CompareXZeroPage, _super);
        function CompareXZeroPage() {
            _super.call(this, "CPX", 0x02, OpCodes.ModeZeroPage, 0xE4);
        }
        CompareXZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            cpu.compareWithFlags(cpu.rX, cpu.peek(zeroPage));
        };
        return CompareXZeroPage;
    })(BaseOpCode);
    Emulator.CompareXZeroPage = CompareXZeroPage;
    registeredOperations.push(CompareXZeroPage);

    var CompareXAbsolute = (function (_super) {
        __extends(CompareXAbsolute, _super);
        function CompareXAbsolute() {
            _super.call(this, "CPX", 0x03, OpCodes.ModeAbsolute, 0xEC);
        }
        CompareXAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            cpu.compareWithFlags(cpu.rX, targetValue);
        };
        return CompareXAbsolute;
    })(BaseOpCode);
    Emulator.CompareXAbsolute = CompareXAbsolute;
    registeredOperations.push(CompareXAbsolute);

    var CompareYImmediate = (function (_super) {
        __extends(CompareYImmediate, _super);
        function CompareYImmediate() {
            _super.call(this, "CPY", 0x02, OpCodes.ModeImmediate, 0xC0);
        }
        CompareYImmediate.prototype.execute = function (cpu) {
            cpu.compareWithFlags(cpu.rY, cpu.addrPop());
        };
        return CompareYImmediate;
    })(BaseOpCode);
    Emulator.CompareYImmediate = CompareYImmediate;
    registeredOperations.push(CompareYImmediate);

    var CompareYZeroPage = (function (_super) {
        __extends(CompareYZeroPage, _super);
        function CompareYZeroPage() {
            _super.call(this, "CPY", 0x02, OpCodes.ModeZeroPage, 0xC4);
        }
        CompareYZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            cpu.compareWithFlags(cpu.rY, cpu.peek(zeroPage));
        };
        return CompareYZeroPage;
    })(BaseOpCode);
    Emulator.CompareYZeroPage = CompareYZeroPage;
    registeredOperations.push(CompareYZeroPage);

    var CompareYAbsolute = (function (_super) {
        __extends(CompareYAbsolute, _super);
        function CompareYAbsolute() {
            _super.call(this, "CPY", 0x03, OpCodes.ModeAbsolute, 0xCC);
        }
        CompareYAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            cpu.compareWithFlags(cpu.rY, targetValue);
        };
        return CompareYAbsolute;
    })(BaseOpCode);
    Emulator.CompareYAbsolute = CompareYAbsolute;
    registeredOperations.push(CompareYAbsolute);

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

    var ExclusiveOrImmediate = (function (_super) {
        __extends(ExclusiveOrImmediate, _super);
        function ExclusiveOrImmediate() {
            _super.call(this, "EOR", 0x02, OpCodes.ModeImmediate, 0x49);
        }
        ExclusiveOrImmediate.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.addrPop();
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrImmediate;
    })(BaseOpCode);
    Emulator.ExclusiveOrImmediate = ExclusiveOrImmediate;
    registeredOperations.push(ExclusiveOrImmediate);

    var ExclusiveOrZeroPage = (function (_super) {
        __extends(ExclusiveOrZeroPage, _super);
        function ExclusiveOrZeroPage() {
            _super.call(this, "EOR", 0x02, OpCodes.ModeZeroPage, 0x45);
        }
        ExclusiveOrZeroPage.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrZeroPage;
    })(BaseOpCode);
    Emulator.ExclusiveOrZeroPage = ExclusiveOrZeroPage;
    registeredOperations.push(ExclusiveOrZeroPage);

    var ExclusiveOrZeroPageX = (function (_super) {
        __extends(ExclusiveOrZeroPageX, _super);
        function ExclusiveOrZeroPageX() {
            _super.call(this, "EOR", 0x02, OpCodes.ModeZeroPageX, 0x55);
        }
        ExclusiveOrZeroPageX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrZeroPageX());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrZeroPageX;
    })(BaseOpCode);
    Emulator.ExclusiveOrZeroPageX = ExclusiveOrZeroPageX;
    registeredOperations.push(ExclusiveOrZeroPageX);

    var ExclusiveOrAbsolute = (function (_super) {
        __extends(ExclusiveOrAbsolute, _super);
        function ExclusiveOrAbsolute() {
            _super.call(this, "EOR", 0x03, OpCodes.ModeAbsolute, 0x4D);
        }
        ExclusiveOrAbsolute.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrPopWord());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrAbsolute;
    })(BaseOpCode);
    Emulator.ExclusiveOrAbsolute = ExclusiveOrAbsolute;
    registeredOperations.push(ExclusiveOrAbsolute);

    var ExclusiveOrAbsoluteX = (function (_super) {
        __extends(ExclusiveOrAbsoluteX, _super);
        function ExclusiveOrAbsoluteX() {
            _super.call(this, "EOR", 0x03, OpCodes.ModeAbsoluteX, 0x5D);
        }
        ExclusiveOrAbsoluteX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrAbsoluteX;
    })(BaseOpCode);
    Emulator.ExclusiveOrAbsoluteX = ExclusiveOrAbsoluteX;
    registeredOperations.push(ExclusiveOrAbsoluteX);

    var ExclusiveOrAbsoluteY = (function (_super) {
        __extends(ExclusiveOrAbsoluteY, _super);
        function ExclusiveOrAbsoluteY() {
            _super.call(this, "EOR", 0x03, OpCodes.ModeAbsoluteY, 0x59);
        }
        ExclusiveOrAbsoluteY.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrAbsoluteY());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrAbsoluteY;
    })(BaseOpCode);
    Emulator.ExclusiveOrAbsoluteY = ExclusiveOrAbsoluteY;
    registeredOperations.push(ExclusiveOrAbsoluteY);

    var ExclusiveOrIndirectX = (function (_super) {
        __extends(ExclusiveOrIndirectX, _super);
        function ExclusiveOrIndirectX() {
            _super.call(this, "EOR", 0x02, OpCodes.ModeIndexedIndirectX, 0x41);
        }
        ExclusiveOrIndirectX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrIndirectX;
    })(BaseOpCode);
    Emulator.ExclusiveOrIndirectX = ExclusiveOrIndirectX;
    registeredOperations.push(ExclusiveOrIndirectX);

    var ExclusiveOrIndirectY = (function (_super) {
        __extends(ExclusiveOrIndirectY, _super);
        function ExclusiveOrIndirectY() {
            _super.call(this, "EOR", 0x02, OpCodes.ModeIndexedIndirectY, 0x51);
        }
        ExclusiveOrIndirectY.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        };
        return ExclusiveOrIndirectY;
    })(BaseOpCode);
    Emulator.ExclusiveOrIndirectY = ExclusiveOrIndirectY;
    registeredOperations.push(ExclusiveOrIndirectY);

    var ClearCarrySingle = (function (_super) {
        __extends(ClearCarrySingle, _super);
        function ClearCarrySingle() {
            _super.call(this, "CLC", 0x01, OpCodes.ModeSingle, 0x18);
        }
        ClearCarrySingle.prototype.execute = function (cpu) {
            cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
        };
        return ClearCarrySingle;
    })(BaseOpCode);
    Emulator.ClearCarrySingle = ClearCarrySingle;
    registeredOperations.push(ClearCarrySingle);

    var SetCarrySingle = (function (_super) {
        __extends(SetCarrySingle, _super);
        function SetCarrySingle() {
            _super.call(this, "SEC", 0x01, OpCodes.ModeSingle, 0x38);
        }
        SetCarrySingle.prototype.execute = function (cpu) {
            cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
        };
        return SetCarrySingle;
    })(BaseOpCode);
    Emulator.SetCarrySingle = SetCarrySingle;
    registeredOperations.push(SetCarrySingle);

    var ClearOverflowSingle = (function (_super) {
        __extends(ClearOverflowSingle, _super);
        function ClearOverflowSingle() {
            _super.call(this, "CLV", 0x01, OpCodes.ModeSingle, 0xB8);
        }
        ClearOverflowSingle.prototype.execute = function (cpu) {
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
        };
        return ClearOverflowSingle;
    })(BaseOpCode);
    Emulator.ClearOverflowSingle = ClearOverflowSingle;
    registeredOperations.push(ClearOverflowSingle);

    var ClearDecimalSingle = (function (_super) {
        __extends(ClearDecimalSingle, _super);
        function ClearDecimalSingle() {
            _super.call(this, "CLD", 0x01, OpCodes.ModeSingle, 0xD8);
        }
        ClearDecimalSingle.prototype.execute = function (cpu) {
            cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
        };
        return ClearDecimalSingle;
    })(BaseOpCode);
    Emulator.ClearDecimalSingle = ClearDecimalSingle;
    registeredOperations.push(ClearDecimalSingle);

    var SetDecimalSingle = (function (_super) {
        __extends(SetDecimalSingle, _super);
        function SetDecimalSingle() {
            _super.call(this, "SED", 0x01, OpCodes.ModeSingle, 0xF8);
        }
        SetDecimalSingle.prototype.execute = function (cpu) {
            cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
        };
        return SetDecimalSingle;
    })(BaseOpCode);
    Emulator.SetDecimalSingle = SetDecimalSingle;
    registeredOperations.push(SetDecimalSingle);

    var InvalidOp = (function (_super) {
        __extends(InvalidOp, _super);
        function InvalidOp(value) {
            _super.call(this, "???", 0x01, OpCodes.ModeSingle, value & Constants.Memory.ByteMask);
        }
        InvalidOp.prototype.execute = function (cpu) {
            var prev = cpu.rPC - 1;
            var opCode = cpu.peek(prev);
            throw "Invalid op code 0x" + opCode.toString(16).toUpperCase() + " encountered at $" + prev.toString(16).toUpperCase();
        };
        return InvalidOp;
    })(BaseOpCode);
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

    var NoOperationSingle = (function (_super) {
        __extends(NoOperationSingle, _super);
        function NoOperationSingle() {
            _super.call(this, "NOP", 0x01, OpCodes.ModeSingle, 0xEA);
        }
        NoOperationSingle.prototype.execute = function (cpu) {
            return;
        };
        return NoOperationSingle;
    })(BaseOpCode);
    Emulator.NoOperationSingle = NoOperationSingle;
    registeredOperations.push(NoOperationSingle);

    var OrImmediate = (function (_super) {
        __extends(OrImmediate, _super);
        function OrImmediate() {
            _super.call(this, "ORA", 0x02, OpCodes.ModeImmediate, 0x09);
        }
        OrImmediate.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.addrPop();
            cpu.setFlags(cpu.rA);
        };
        return OrImmediate;
    })(BaseOpCode);
    Emulator.OrImmediate = OrImmediate;
    registeredOperations.push(OrImmediate);

    var OrZeroPage = (function (_super) {
        __extends(OrZeroPage, _super);
        function OrZeroPage() {
            _super.call(this, "ORA", 0x02, OpCodes.ModeZeroPage, 0x05);
        }
        OrZeroPage.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        };
        return OrZeroPage;
    })(BaseOpCode);
    Emulator.OrZeroPage = OrZeroPage;
    registeredOperations.push(OrZeroPage);

    var OrZeroPageX = (function (_super) {
        __extends(OrZeroPageX, _super);
        function OrZeroPageX() {
            _super.call(this, "ORA", 0x02, OpCodes.ModeZeroPageX, 0x15);
        }
        OrZeroPageX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrZeroPageX());
            cpu.setFlags(cpu.rA);
        };
        return OrZeroPageX;
    })(BaseOpCode);
    Emulator.OrZeroPageX = OrZeroPageX;
    registeredOperations.push(OrZeroPageX);

    var OrAbsolute = (function (_super) {
        __extends(OrAbsolute, _super);
        function OrAbsolute() {
            _super.call(this, "ORA", 0x03, OpCodes.ModeAbsolute, 0x0D);
        }
        OrAbsolute.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrPopWord());
            cpu.setFlags(cpu.rA);
        };
        return OrAbsolute;
    })(BaseOpCode);
    Emulator.OrAbsolute = OrAbsolute;
    registeredOperations.push(OrAbsolute);

    var OrAbsoluteX = (function (_super) {
        __extends(OrAbsoluteX, _super);
        function OrAbsoluteX() {
            _super.call(this, "ORA", 0x03, OpCodes.ModeAbsoluteX, 0x1D);
        }
        OrAbsoluteX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        };
        return OrAbsoluteX;
    })(BaseOpCode);
    Emulator.OrAbsoluteX = OrAbsoluteX;
    registeredOperations.push(OrAbsoluteX);

    var OrAbsoluteY = (function (_super) {
        __extends(OrAbsoluteY, _super);
        function OrAbsoluteY() {
            _super.call(this, "ORA", 0x03, OpCodes.ModeAbsoluteY, 0x19);
        }
        OrAbsoluteY.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrAbsoluteY());
            cpu.setFlags(cpu.rA);
        };
        return OrAbsoluteY;
    })(BaseOpCode);
    Emulator.OrAbsoluteY = OrAbsoluteY;
    registeredOperations.push(OrAbsoluteY);

    var OrIndirectX = (function (_super) {
        __extends(OrIndirectX, _super);
        function OrIndirectX() {
            _super.call(this, "ORA", 0x02, OpCodes.ModeIndexedIndirectX, 0x01);
        }
        OrIndirectX.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        };
        return OrIndirectX;
    })(BaseOpCode);
    Emulator.OrIndirectX = OrIndirectX;
    registeredOperations.push(OrIndirectX);

    var OrIndirectY = (function (_super) {
        __extends(OrIndirectY, _super);
        function OrIndirectY() {
            _super.call(this, "ORA", 0x02, OpCodes.ModeIndexedIndirectY, 0x11);
        }
        OrIndirectY.prototype.execute = function (cpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        };
        return OrIndirectY;
    })(BaseOpCode);
    Emulator.OrIndirectY = OrIndirectY;
    registeredOperations.push(OrIndirectY);

    var RtsSingle = (function (_super) {
        __extends(RtsSingle, _super);
        function RtsSingle() {
            _super.call(this, "RTS", 0x01, OpCodes.ModeSingle, 0x60);
        }
        RtsSingle.prototype.execute = function (cpu) {
            cpu.stackRts();
        };
        return RtsSingle;
    })(BaseOpCode);
    Emulator.RtsSingle = RtsSingle;
    registeredOperations.push(RtsSingle);

    var PullProcessorStatusSingle = (function (_super) {
        __extends(PullProcessorStatusSingle, _super);
        function PullProcessorStatusSingle() {
            _super.call(this, "PLP", 0x01, OpCodes.ModeSingle, 0x28);
        }
        PullProcessorStatusSingle.prototype.execute = function (cpu) {
            cpu.rP = cpu.stackPop();
        };
        return PullProcessorStatusSingle;
    })(BaseOpCode);
    Emulator.PullProcessorStatusSingle = PullProcessorStatusSingle;
    registeredOperations.push(PullProcessorStatusSingle);

    var PushProcessorStatusSingle = (function (_super) {
        __extends(PushProcessorStatusSingle, _super);
        function PushProcessorStatusSingle() {
            _super.call(this, "PHP", 0x01, OpCodes.ModeSingle, 0x08);
        }
        PushProcessorStatusSingle.prototype.execute = function (cpu) {
            cpu.stackPush(cpu.rP);
        };
        return PushProcessorStatusSingle;
    })(BaseOpCode);
    Emulator.PushProcessorStatusSingle = PushProcessorStatusSingle;
    registeredOperations.push(PushProcessorStatusSingle);

    var PullAccumulatorSingle = (function (_super) {
        __extends(PullAccumulatorSingle, _super);
        function PullAccumulatorSingle() {
            _super.call(this, "PLA", 0x01, OpCodes.ModeSingle, 0x68);
        }
        PullAccumulatorSingle.prototype.execute = function (cpu) {
            cpu.rA = cpu.stackPop();
            cpu.setFlags(cpu.rA);
        };
        return PullAccumulatorSingle;
    })(BaseOpCode);
    Emulator.PullAccumulatorSingle = PullAccumulatorSingle;
    registeredOperations.push(PullAccumulatorSingle);

    var PushAccumulatorSingle = (function (_super) {
        __extends(PushAccumulatorSingle, _super);
        function PushAccumulatorSingle() {
            _super.call(this, "PHA", 0x01, OpCodes.ModeSingle, 0x48);
        }
        PushAccumulatorSingle.prototype.execute = function (cpu) {
            cpu.stackPush(cpu.rA);
        };
        return PushAccumulatorSingle;
    })(BaseOpCode);
    Emulator.PushAccumulatorSingle = PushAccumulatorSingle;
    registeredOperations.push(PushAccumulatorSingle);

    var TransferXRegisterToStackPointerSingle = (function (_super) {
        __extends(TransferXRegisterToStackPointerSingle, _super);
        function TransferXRegisterToStackPointerSingle() {
            _super.call(this, "TXS", 0x01, OpCodes.ModeSingle, 0x9A);
        }
        TransferXRegisterToStackPointerSingle.prototype.execute = function (cpu) {
            cpu.rSP = cpu.rX;
        };
        return TransferXRegisterToStackPointerSingle;
    })(BaseOpCode);
    Emulator.TransferXRegisterToStackPointerSingle = TransferXRegisterToStackPointerSingle;
    registeredOperations.push(TransferXRegisterToStackPointerSingle);

    var TransferStackPointerToXRegisterSingle = (function (_super) {
        __extends(TransferStackPointerToXRegisterSingle, _super);
        function TransferStackPointerToXRegisterSingle() {
            _super.call(this, "TSX", 0x01, OpCodes.ModeSingle, 0xBA);
        }
        TransferStackPointerToXRegisterSingle.prototype.execute = function (cpu) {
            cpu.rX = cpu.rSP;
        };
        return TransferStackPointerToXRegisterSingle;
    })(BaseOpCode);
    Emulator.TransferStackPointerToXRegisterSingle = TransferStackPointerToXRegisterSingle;
    registeredOperations.push(TransferStackPointerToXRegisterSingle);

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

    var StoreYRegisterAbsolute = (function () {
        function StoreYRegisterAbsolute() {
            this.opName = "STY";
            this.sizeBytes = 0x03;
            this.addressingMode = OpCodes.ModeAbsolute;
            this.opCode = 0x8c;
        }
        StoreYRegisterAbsolute.prototype.decompile = function (address, bytes) {
            return OpCodes.ToDecompiledLine(OpCodes.ToWord(address), this.opName, "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        };

        StoreYRegisterAbsolute.prototype.execute = function (cpu) {
            var targetAddress = cpu.addrPopWord();
            cpu.poke(targetAddress, cpu.rY);
        };
        return StoreYRegisterAbsolute;
    })();
    Emulator.StoreYRegisterAbsolute = StoreYRegisterAbsolute;

    registeredOperations.push(StoreYRegisterAbsolute);

    var SubtractWithCarryImmediate = (function (_super) {
        __extends(SubtractWithCarryImmediate, _super);
        function SubtractWithCarryImmediate() {
            _super.call(this, "SBC", 0x02, OpCodes.ModeImmediate, 0xE9);
        }
        SubtractWithCarryImmediate.prototype.execute = function (cpu) {
            OpCodes.SubtractWithCarry(cpu, cpu.addrPop());
        };
        return SubtractWithCarryImmediate;
    })(BaseOpCode);
    Emulator.SubtractWithCarryImmediate = SubtractWithCarryImmediate;
    registeredOperations.push(SubtractWithCarryImmediate);

    var SubtractWithCarryZeroPage = (function (_super) {
        __extends(SubtractWithCarryZeroPage, _super);
        function SubtractWithCarryZeroPage() {
            _super.call(this, "SBC", 0x02, OpCodes.ModeZeroPage, 0xE5);
        }
        SubtractWithCarryZeroPage.prototype.execute = function (cpu) {
            var zeroPage = cpu.addrPop();
            OpCodes.SubtractWithCarry(cpu, cpu.peek(zeroPage));
        };
        return SubtractWithCarryZeroPage;
    })(BaseOpCode);
    Emulator.SubtractWithCarryZeroPage = SubtractWithCarryZeroPage;
    registeredOperations.push(SubtractWithCarryZeroPage);

    var SubtractWithCarryZeroPageX = (function (_super) {
        __extends(SubtractWithCarryZeroPageX, _super);
        function SubtractWithCarryZeroPageX() {
            _super.call(this, "SBC", 0x02, OpCodes.ModeZeroPageX, 0xF5);
        }
        SubtractWithCarryZeroPageX.prototype.execute = function (cpu) {
            OpCodes.SubtractWithCarry(cpu, cpu.peek(cpu.addrZeroPageX()));
        };
        return SubtractWithCarryZeroPageX;
    })(BaseOpCode);
    Emulator.SubtractWithCarryZeroPageX = SubtractWithCarryZeroPageX;
    registeredOperations.push(SubtractWithCarryZeroPageX);

    var SubtractWithCarryAbsolute = (function (_super) {
        __extends(SubtractWithCarryAbsolute, _super);
        function SubtractWithCarryAbsolute() {
            _super.call(this, "SBC", 0x03, OpCodes.ModeAbsolute, 0xED);
        }
        SubtractWithCarryAbsolute.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrPopWord());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        };
        return SubtractWithCarryAbsolute;
    })(BaseOpCode);
    Emulator.SubtractWithCarryAbsolute = SubtractWithCarryAbsolute;
    registeredOperations.push(SubtractWithCarryAbsolute);

    var SubtractWithCarryAbsoluteX = (function (_super) {
        __extends(SubtractWithCarryAbsoluteX, _super);
        function SubtractWithCarryAbsoluteX() {
            _super.call(this, "SBC", 0x03, OpCodes.ModeAbsoluteX, 0xFD);
        }
        SubtractWithCarryAbsoluteX.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrAbsoluteX());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        };
        return SubtractWithCarryAbsoluteX;
    })(BaseOpCode);
    Emulator.SubtractWithCarryAbsoluteX = SubtractWithCarryAbsoluteX;
    registeredOperations.push(SubtractWithCarryAbsoluteX);

    var SubtractWithCarryAbsoluteY = (function (_super) {
        __extends(SubtractWithCarryAbsoluteY, _super);
        function SubtractWithCarryAbsoluteY() {
            _super.call(this, "SBC", 0x03, OpCodes.ModeAbsoluteY, 0xF9);
        }
        SubtractWithCarryAbsoluteY.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrAbsoluteY());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        };
        return SubtractWithCarryAbsoluteY;
    })(BaseOpCode);
    Emulator.SubtractWithCarryAbsoluteY = SubtractWithCarryAbsoluteY;
    registeredOperations.push(SubtractWithCarryAbsoluteY);

    var SubtractWithCarryIndexedIndirectX = (function (_super) {
        __extends(SubtractWithCarryIndexedIndirectX, _super);
        function SubtractWithCarryIndexedIndirectX() {
            _super.call(this, "SBC", 0x02, OpCodes.ModeIndexedIndirectX, 0xE1);
        }
        SubtractWithCarryIndexedIndirectX.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrIndexedIndirectX());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        };
        return SubtractWithCarryIndexedIndirectX;
    })(BaseOpCode);
    Emulator.SubtractWithCarryIndexedIndirectX = SubtractWithCarryIndexedIndirectX;
    registeredOperations.push(SubtractWithCarryIndexedIndirectX);

    var SubtractWithCarryIndirectIndexedY = (function (_super) {
        __extends(SubtractWithCarryIndirectIndexedY, _super);
        function SubtractWithCarryIndirectIndexedY() {
            _super.call(this, "SBC", 0x02, OpCodes.ModeIndexedIndirectY, 0xF1);
        }
        SubtractWithCarryIndirectIndexedY.prototype.execute = function (cpu) {
            var targetValue = cpu.peek(cpu.addrIndirectIndexedY());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        };
        return SubtractWithCarryIndirectIndexedY;
    })(BaseOpCode);
    Emulator.SubtractWithCarryIndirectIndexedY = SubtractWithCarryIndirectIndexedY;
    registeredOperations.push(SubtractWithCarryIndirectIndexedY);

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
