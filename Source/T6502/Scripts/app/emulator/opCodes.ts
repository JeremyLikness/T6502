///<reference path="cpu.ts"/>
///<reference path="compiler.ts"/>

module Emulator {

    export interface IOperation {
        execute(cpu: Emulator.ICpu);
        addressingMode: number;
        opCode: number;
        opName: string;
        sizeBytes: number; 
        decompile(address: number, bytes: number[]): string;
    }

    var registeredOperations: { new(): IOperation; }[] = [];

    export class OpCodes {
    
        public static ModeImmediate: number = 1;
        public static ModeZeroPage: number = 2;
        public static ModeZeroPageX: number = 3;
        public static ModeZeroPageY: number = 4;
        public static ModeAbsolute: number = 5;
        public static ModeAbsoluteX: number = 6;
        public static ModeAbsoluteY: number = 7;
        public static ModeIndirect: number = 8;
        public static ModeIndexedIndirectX: number = 9;
        public static ModeIndexedIndirectY: number = 10;
        public static ModeSingle: number = 11; 
        public static ModeRelative: number = 12;

        public static computeBranch(address: number, offset: number): number {
            var result: number = 0;
            if (offset > Constants.Memory.BranchBack) {
                result = (address - (Constants.Memory.BranchOffset - offset));
            }
            else {
                result = address + offset;
            }
            return result;
        }

        public static LoadOpCodesByName(opCode: string): IOperation[] {
            var result: IOperation[] = [];
            var idx: number;
            for(var idx = 0; idx < registeredOperations.length; idx++) {
                var operation: IOperation = new registeredOperations[idx]();
                if (operation.opName === opCode) {
                    result.push(operation);
                }
            }
            return result;
        }

        public static ToByte(value: number): string {
            var valueStr = value.toString(16).toUpperCase();
            return valueStr.length == 1 ? "0" + valueStr : valueStr;
        }

        public static ToWord(value: number): string {
            var padding = ["000", "00", "0"];
            var valueStr = value.toString(16).toUpperCase();
            if (valueStr.length === 4) {
                return valueStr;
            }
            else {
                return padding[valueStr.length-1] + valueStr;
            }            
        }

        public static ToDecompiledLine(address: string, opCode: string, parm: string) {
            return "$" + address + ": " + opCode + " " + parm;
        }

        public static ProcessLine(address: number, op: IOperation, bytes: number[]): string {
            if (op.addressingMode === OpCodes.ModeImmediate) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "#$" + OpCodes.ToByte(bytes[1]));
            }
            
            if (op.addressingMode === OpCodes.ModeZeroPage) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "$" + OpCodes.ToByte(bytes[1]));
            }

            if (op.addressingMode === OpCodes.ModeZeroPageX) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "$" + OpCodes.ToByte(bytes[1]) + ",X");
            }

            if (op.addressingMode === OpCodes.ModeAbsolute) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
            }

            if (op.addressingMode === OpCodes.ModeAbsoluteX) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
            }

            if (op.addressingMode === OpCodes.ModeAbsoluteY) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", Y");
            }

            if (op.addressingMode === OpCodes.ModeRelative) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
            }

            if (op.addressingMode === OpCodes.ModeSingle) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "");
            }

            if (op.addressingMode === OpCodes.ModeIndexedIndirectX) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "($" + OpCodes.ToByte(bytes[1]) + ", X)");
            }

            if (op.addressingMode === OpCodes.ModeIndexedIndirectY) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "($" + OpCodes.ToByte(bytes[1]) + "), Y");        
            }

            if (op.addressingMode === OpCodes.ModeIndirect) {
                return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    op.opName,
                    "($" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ")");
            }

            throw "Unknown addressing mode.";
        }
       
        public static FillOps(operationMap: IOperation[]): void {
            var idx: number;
            var size: number = Constants.Memory.ByteMask + 1;
            while (size -= 1) {
                var invalid = new InvalidOp(size);            
                operationMap.push(invalid);
            }

            for (idx = 0; idx < registeredOperations.length; idx++) {
                var operation = new registeredOperations[idx]();
                operationMap[operation.opCode] = operation;
            }
        }    
        
        public static AddWithCarry(cpu: Emulator.ICpu, src: number) {
            var temp: number;
            var carryFactor: number = cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0;
            var overflowFlag: boolean;

            function offsetAdjustAdd(offs: number, cutOff: number): boolean {
                if (offs >= cutOff) {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offs >= 0x180) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);                       
                    }
                    return true;
                }
                else {
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
            }
            else {
                temp = cpu.rA + src + carryFactor;
                offsetAdjustAdd(temp, 0x100);
            }
            cpu.rA = temp & Constants.Memory.ByteMask; 
            cpu.setFlags(cpu.rA);
        }

        public static SubtractWithCarry(cpu: Emulator.ICpu, src: number) {
            var temp: number, offset: number, carryFactor: number;
            var overflowFlag: boolean;

            function offsetAdjustSub(offs: number): boolean {
                if (offs < 0x100) {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offs < Constants.ProcessorStatus.NegativeFlagSet) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
                    }
                    return true;
                }
                else {
                    cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
                    if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet) && offset >= 0x180) {
                        cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
                    }
                    return false;
                }
            };

            carryFactor = cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0;
            
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, !!((cpu.rA ^ src) & Constants.ProcessorStatus.NegativeFlagSet));
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                temp = Constants.Memory.NibbleMask + (cpu.rA & Constants.Memory.NibbleMask) - (src & Constants.Memory.NibbleMask) + carryFactor;
                if (temp < 0x10) {
                    offset = 0;
                    temp -= 0x06;
                }
                else {
                    offset = 0x10;
                    temp -= 0x10;
                }
                offset += Constants.Memory.HighNibbleMask + (cpu.rA & Constants.Memory.HighNibbleMask) - (src & Constants.Memory.HighNibbleMask);
                if (offsetAdjustSub(offset)) {
                    offset -= 0x60;
                }
                offset += temp;
            }
            else {
                offset = Constants.Memory.ByteMask + cpu.rA - src + carryFactor;
                offsetAdjustSub(offset); 
            }
            cpu.rA = offset & Constants.Memory.ByteMask; 
            cpu.setFlags(cpu.rA);
        }
    }   

    export class BaseOpCode implements IOperation {
        
        constructor(
            public opName: string, 
            public sizeBytes: number, 
            public addressingMode: number, 
            public opCode: number) {        
        }

        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ProcessLine(address, this, bytes);                
        }

        public execute(cpu: Emulator.ICpu) {
            return;
        }
    }

    /* =========== 
       === CompilerOnly === 
       =========== */

    export class Dcb extends BaseOpCode {
        constructor() {
            super("DCB", 0x00, OpCodes.ModeSingle, 0xFFFF);
        }
        public execute(cpu: Emulator.ICpu) {
            throw "DCB is a compiler directive only.";
        }
    }    
    registeredOperations.push(Dcb);
    

    /* =========== 
       === ADC === 
       =========== */

    export class AddWithCarryImmediate extends BaseOpCode {
        constructor() {
            super("ADC", 0x02, OpCodes.ModeImmediate, 0x69);
        }
        public execute(cpu: Emulator.ICpu) {
            OpCodes.AddWithCarry(cpu, cpu.addrPop());
        }
    }    
    registeredOperations.push(AddWithCarryImmediate);
    
    export class AddWithCarryZeroPage extends BaseOpCode {
        constructor() {
            super("ADC", 0x02, OpCodes.ModeZeroPage, 0x65);
        }        
        public execute(cpu: Emulator.ICpu) {
            var zeroPage = cpu.addrPop();
            OpCodes.AddWithCarry(cpu, cpu.peek(zeroPage));
        }
    }    
    registeredOperations.push(AddWithCarryZeroPage);
    
    export class AddWithCarryZeroPageX extends BaseOpCode {
        constructor() {
            super("ADC", 0x02, OpCodes.ModeZeroPageX, 0x75);
        }
        public execute(cpu: Emulator.ICpu) {
            OpCodes.AddWithCarry(cpu, cpu.peek(cpu.addrZeroPageX()));
        }
    }    
    registeredOperations.push(AddWithCarryZeroPageX);
    
    export class AddWithCarryAbsolute extends BaseOpCode {
        constructor() {
            super("ADC", 0x03, OpCodes.ModeAbsolute, 0x6D);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            OpCodes.AddWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(AddWithCarryAbsolute);

    export class AddWithCarryAbsoluteX extends BaseOpCode {
        constructor() {
            super("ADC", 0x03, OpCodes.ModeAbsoluteX, 0x7D);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrAbsoluteX());
            OpCodes.AddWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(AddWithCarryAbsoluteX);

    export class AddWithCarryAbsoluteY extends BaseOpCode {
        constructor() {
            super("ADC", 0x03, OpCodes.ModeAbsoluteY, 0x79);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrAbsoluteY());
            OpCodes.AddWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(AddWithCarryAbsoluteY);

    export class AddWithCarryIndexedIndirectX extends BaseOpCode {
        constructor() {
            super("ADC", 0x02, OpCodes.ModeIndexedIndirectX, 0x61);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrIndexedIndirectX());
            OpCodes.AddWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(AddWithCarryIndexedIndirectX);

    export class AddWithCarryIndirectIndexedY extends BaseOpCode {
        constructor() {
            super("ADC", 0x02, OpCodes.ModeIndexedIndirectY, 0x71);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrIndirectIndexedY());
            OpCodes.AddWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(AddWithCarryIndirectIndexedY);

    /* =========== 
       === AND === 
       =========== */

    export class AndImmediate extends BaseOpCode {
        constructor() {
            super("AND", 0x02, OpCodes.ModeImmediate, 0x29);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.addrPop();
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndImmediate);

    export class AndZeroPage extends BaseOpCode {
        constructor() {
            super("AND", 0x02, OpCodes.ModeZeroPage, 0x25);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndZeroPage);

    export class AndZeroPageX extends BaseOpCode {
        constructor() {
            super("AND", 0x02, OpCodes.ModeZeroPageX, 0x35);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrZeroPageX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndZeroPageX);

    export class AndAbsolute extends BaseOpCode {
        constructor() {
            super("AND", 0x03, OpCodes.ModeAbsolute, 0x2D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrPopWord());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndAbsolute);

    export class AndAbsoluteX extends BaseOpCode {
        constructor() {
            super("AND", 0x03, OpCodes.ModeAbsoluteX, 0x3D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndAbsoluteX);

    export class AndAbsoluteY extends BaseOpCode {
        constructor() {
            super("AND", 0x03, OpCodes.ModeAbsoluteY, 0x39);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrAbsoluteY());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndAbsoluteY);

    export class AndIndirectX extends BaseOpCode {
        constructor() {
            super("AND", 0x02, OpCodes.ModeIndexedIndirectX, 0x21);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndIndirectX);

    export class AndIndirectY extends BaseOpCode {
        constructor() {
            super("AND", 0x02, OpCodes.ModeIndexedIndirectY, 0x31);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(AndIndirectY);

    /* ===========
       === BIT ===
       =========== */
    export class BitAbsolute extends BaseOpCode {
        constructor() {
            super("BIT", 0x03, OpCodes.ModeAbsolute, 0x2C);
        }
        public execute(cpu: Emulator.ICpu) {
            var address: number = cpu.addrPopWord();
            var value: number = cpu.peek(address); 
            cpu.setFlag(Constants.ProcessorStatus.ZeroFlagSet, (cpu.rA & value) === 0);
            cpu.setFlag(Constants.ProcessorStatus.NegativeFlagSet, !!(value & Constants.ProcessorStatus.NegativeFlagSet));
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, !!(value & Constants.ProcessorStatus.OverflowFlagSet));
        }
    }
    registeredOperations.push(BitAbsolute);

    export class BitZeroPage extends BaseOpCode {
        constructor() {
            super("BIT", 0x02, OpCodes.ModeAbsolute, 0x24);
        }
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            var value: number = cpu.peek(zeroPage); 
            cpu.setFlag(Constants.ProcessorStatus.ZeroFlagSet, (cpu.rA & value) === 0);
            cpu.setFlag(Constants.ProcessorStatus.NegativeFlagSet, (value & Constants.ProcessorStatus.NegativeFlagSet) > 0);
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, (value & Constants.ProcessorStatus.OverflowFlagSet) > 0);
        }
    }
    registeredOperations.push(BitZeroPage);


    /* ================ 
       === BRANCHES === 
       ================ */

    export class BranchNotEqualRelative extends BaseOpCode {
        constructor() {
            super("BNE", 0x02, OpCodes.ModeRelative, 0xD0);
        }        
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchNotEqualRelative);

    export class BranchEqualRelative extends BaseOpCode {
        constructor() {
            super("BEQ", 0x02, OpCodes.ModeRelative, 0xF0);
        }
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchEqualRelative);
    
    export class BranchMinusRelative extends BaseOpCode {
        constructor() {
            super("BMI", 0x02, OpCodes.ModeRelative, 0x30);
        }   
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchMinusRelative);

    export class BranchPlusRelative extends BaseOpCode {
        constructor() {
            super("BPL", 0x02, OpCodes.ModeRelative, 0x10);
        }
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchPlusRelative);

    export class BranchOverflowClearRelative extends BaseOpCode {
        constructor() {
            super("BVC", 0x02, OpCodes.ModeRelative, 0x50);
        }
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchOverflowClearRelative);

    export class BranchOverflowSetRelative extends BaseOpCode {
        constructor() {
            super("BVS", 0x02, OpCodes.ModeRelative, 0x70);
        }
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchOverflowSetRelative);
    
    export class BranchCarryClearRelative extends BaseOpCode {
        constructor() {
            super("BCC", 0x02, OpCodes.ModeRelative, 0x90);
        }
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchCarryClearRelative);

    export class BranchCarrySetRelative extends BaseOpCode {
        constructor() {
            super("BCS", 0x02, OpCodes.ModeRelative, 0xB0);
        }
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }    
    registeredOperations.push(BranchCarrySetRelative);

    /* ===========
       === CMP ===
       =========== */

    export class CompareAccumulatorImmediate extends BaseOpCode {
        constructor() {
            super("CMP", 0x02, OpCodes.ModeImmediate, 0xC9);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rA, cpu.addrPop());
        }
    }
    registeredOperations.push(CompareAccumulatorImmediate);

    export class CompareAccumulatorZeroPage extends BaseOpCode {
        constructor() {
            super("CMP", 0x02, OpCodes.ModeZeroPage, 0xC5);
        }        
        public execute(cpu: Emulator.ICpu) {
            var zeroPage = cpu.addrPop();
            cpu.compareWithFlags(cpu.rA, cpu.peek(zeroPage));
        }
    }    
    registeredOperations.push(CompareAccumulatorZeroPage);
    
    export class CompareAccumulatorZeroPageX extends BaseOpCode {
        constructor() {
            super("CMP", 0x02, OpCodes.ModeZeroPageX, 0xD5);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rA, cpu.peek(cpu.addrZeroPageX()));
        }
    }    
    registeredOperations.push(CompareAccumulatorZeroPageX);
    
    export class CompareAccumulatorAbsolute extends BaseOpCode {
        constructor() {
            super("CMP", 0x03, OpCodes.ModeAbsolute, 0xCD);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            cpu.compareWithFlags(cpu.rA, targetValue);
        }
    }    
    registeredOperations.push(CompareAccumulatorAbsolute);

    export class CompareAccumulatorAbsoluteX extends BaseOpCode {
        constructor() {
            super("CMP", 0x03, OpCodes.ModeAbsoluteX, 0xDD);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrAbsoluteX());
            cpu.compareWithFlags(cpu.rA, targetValue);
        }
    }    
    registeredOperations.push(CompareAccumulatorAbsoluteX);

    export class CompareAccumulatorAbsoluteY extends BaseOpCode {
        constructor() {
            super("CMP", 0x03, OpCodes.ModeAbsoluteY, 0xD9);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrAbsoluteY());
            cpu.compareWithFlags(cpu.rA, targetValue);
        }
    }    
    registeredOperations.push(CompareAccumulatorAbsoluteY);

    export class CompareAccumulatorIndexedIndirectX extends BaseOpCode {
        constructor() {
            super("CMP", 0x02, OpCodes.ModeIndexedIndirectX, 0xC1);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrIndexedIndirectX());
            cpu.compareWithFlags(cpu.rA, targetValue);
        }
    }    
    registeredOperations.push(CompareAccumulatorIndexedIndirectX);

    export class CompareAccumulatorIndirectIndexedY extends BaseOpCode {
        constructor() {
            super("CMP", 0x02, OpCodes.ModeIndexedIndirectY, 0xD1);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrIndirectIndexedY());
            cpu.compareWithFlags(cpu.rA, targetValue);
        }
    }    
    registeredOperations.push(CompareAccumulatorIndirectIndexedY);

    /* ===========
       === CPX ===
       =========== */

    export class CompareXImmediate extends BaseOpCode {
        constructor() {
            super("CPX", 0x02, OpCodes.ModeImmediate, 0xE0);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rX, cpu.addrPop());
        }
    }
    registeredOperations.push(CompareXImmediate);

    export class CompareXZeroPage extends BaseOpCode {
        constructor() {
            super("CPX", 0x02, OpCodes.ModeZeroPage, 0xE4);
        }        
        public execute(cpu: Emulator.ICpu) {
            var zeroPage = cpu.addrPop();
            cpu.compareWithFlags(cpu.rX, cpu.peek(zeroPage));
        }
    }    
    registeredOperations.push(CompareXZeroPage);
    
    export class CompareXAbsolute extends BaseOpCode {
        constructor() {
            super("CPX", 0x03, OpCodes.ModeAbsolute, 0xEC);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            cpu.compareWithFlags(cpu.rX, targetValue);
        }
    }    
    registeredOperations.push(CompareXAbsolute);

    /* ===========
       === CPY ===
       =========== */

    export class CompareYImmediate extends BaseOpCode {
        constructor() {
            super("CPY", 0x02, OpCodes.ModeImmediate, 0xC0);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rY, cpu.addrPop());
        }
    }
    registeredOperations.push(CompareYImmediate);

    export class CompareYZeroPage extends BaseOpCode {
        constructor() {
            super("CPY", 0x02, OpCodes.ModeZeroPage, 0xC4);
        }        
        public execute(cpu: Emulator.ICpu) {
            var zeroPage = cpu.addrPop();
            cpu.compareWithFlags(cpu.rY, cpu.peek(zeroPage));
        }
    }    
    registeredOperations.push(CompareYZeroPage);
    
    export class CompareYAbsolute extends BaseOpCode {
        constructor() {
            super("CPY", 0x03, OpCodes.ModeAbsolute, 0xCC);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            cpu.compareWithFlags(cpu.rY, targetValue);
        }
    }    
    registeredOperations.push(CompareYAbsolute);    
    
    export class DecXSingle extends BaseOpCode {
        constructor() {
            super("DEX", 0x01, OpCodes.ModeSingle, 0xCA);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rX -= 1;
            if (cpu.rX < 0) {
                cpu.rX = Constants.Memory.ByteMask;
            }
            cpu.setFlags(cpu.rX);
        }
    }
    registeredOperations.push(DecXSingle);

    export class DecYSingle extends BaseOpCode {
        constructor() {
            super("DEY", 0x01, OpCodes.ModeSingle, 0x88);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rY -= 1;
            if (cpu.rY < 0) {
                cpu.rY = Constants.Memory.ByteMask;
            }
            cpu.setFlags(cpu.rY);
        }
    }
    registeredOperations.push(DecYSingle);

    /* =========== 
       === EOR === 
       =========== */

    export class ExclusiveOrImmediate extends BaseOpCode {
        constructor() {
            super("EOR", 0x02, OpCodes.ModeImmediate, 0x49);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.addrPop();
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrImmediate);

    export class ExclusiveOrZeroPage extends BaseOpCode {
        constructor() {
            super("EOR", 0x02, OpCodes.ModeZeroPage, 0x45);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrZeroPage);

    export class ExclusiveOrZeroPageX extends BaseOpCode {
        constructor() {
            super("EOR", 0x02, OpCodes.ModeZeroPageX, 0x55);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrZeroPageX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrZeroPageX);

    export class ExclusiveOrAbsolute extends BaseOpCode {
        constructor() {
            super("EOR", 0x03, OpCodes.ModeAbsolute, 0x4D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrPopWord());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrAbsolute);

    export class ExclusiveOrAbsoluteX extends BaseOpCode {
        constructor() {
            super("EOR", 0x03, OpCodes.ModeAbsoluteX, 0x5D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrAbsoluteX);

    export class ExclusiveOrAbsoluteY extends BaseOpCode {
        constructor() {
            super("EOR", 0x03, OpCodes.ModeAbsoluteY, 0x59);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrAbsoluteY());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrAbsoluteY);

    export class ExclusiveOrIndirectX extends BaseOpCode {
        constructor() {
            super("EOR", 0x02, OpCodes.ModeIndexedIndirectX, 0x41);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrIndirectX);

    export class ExclusiveOrIndirectY extends BaseOpCode {
        constructor() {
            super("EOR", 0x02, OpCodes.ModeIndexedIndirectY, 0x51);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA ^ cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(ExclusiveOrIndirectY);

    /* =======================
       === Flag Operations === 
       ======================= */

    export class ClearCarrySingle extends BaseOpCode {
        constructor() {
            super("CLC", 0x01, OpCodes.ModeSingle, 0x18);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, false);
        }
    }    
    registeredOperations.push(ClearCarrySingle);

    export class SetCarrySingle extends BaseOpCode {
        constructor() {
            super("SEC", 0x01, OpCodes.ModeSingle, 0x38);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, true);
        }
    }    
    registeredOperations.push(SetCarrySingle);

    export class ClearOverflowSingle extends BaseOpCode {
        constructor() {
            super("CLV", 0x01, OpCodes.ModeSingle, 0xB8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, false);
        }
    }    
    registeredOperations.push(ClearOverflowSingle);

    export class ClearDecimalSingle extends BaseOpCode {
        constructor() {
            super("CLD", 0x01, OpCodes.ModeSingle, 0xD8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
        }
    }    
    registeredOperations.push(ClearDecimalSingle);

    export class SetDecimalSingle extends BaseOpCode {
        constructor() {
            super("SED", 0x01, OpCodes.ModeSingle, 0xF8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, true);
        }
    }    
    registeredOperations.push(SetDecimalSingle);


    /* ================== 
       === Invalid OP === 
       ================== */

    export class InvalidOp extends BaseOpCode {
      
        constructor(value: number) {
            super("???", 0x01, OpCodes.ModeSingle, value & Constants.Memory.ByteMask);            
        }
        public execute(cpu: Emulator.ICpu) {
            var prev = cpu.rPC - 1;
            var opCode = cpu.peek(prev);
            throw "Invalid op code 0x" + opCode.toString(16).toUpperCase() +
                 " encountered at $" + prev.toString(16).toUpperCase();
        }
    }
    export class IncAbsolute extends BaseOpCode {
        constructor() {
            super("INC", 0x03, OpCodes.ModeAbsolute, 0xEE);
        }
        public execute(cpu: Emulator.ICpu) {
            var target: number = cpu.addrPopWord();
            var value: number = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        }
    }
    registeredOperations.push(IncAbsolute);

    export class IncAbsoluteX extends BaseOpCode {
        constructor() {
            super("INC", 0x03, OpCodes.ModeAbsoluteX, 0xFE);
        }
        public execute(cpu: Emulator.ICpu) {
            var target: number = cpu.addrAbsoluteX();
            var value: number = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        }
    }
    registeredOperations.push(IncAbsoluteX);

    export class IncXSingle extends BaseOpCode {
        constructor() {
            super("IDX", 0x01, OpCodes.ModeSingle, 0xE8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = ((cpu.rX) + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rX);
        }
    }
    registeredOperations.push(IncXSingle);

    export class IncYSingle extends BaseOpCode {
        constructor() {
            super("INY", 0x01, OpCodes.ModeSingle, 0xC8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rY = ((cpu.rY) + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rY);
        }
    }
    registeredOperations.push(IncYSingle);

    export class IncZeroPage extends BaseOpCode {
        constructor() {
            super("INC", 0x02, OpCodes.ModeZeroPage, 0xE6);
        }
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            var value: number = cpu.peek(zeroPage);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(zeroPage, value);
            cpu.setFlags(value);
        }
    }
    registeredOperations.push(IncZeroPage);

    export class IncrementX extends BaseOpCode {
        constructor() {
            super("INX", 0x01, OpCodes.ModeSingle, 0xE8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = (cpu.rX + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rX);
        }
    }
    registeredOperations.push(IncrementX);

    export class JmpIndirect extends BaseOpCode {
        constructor() {
            super("JMP", 0x03, OpCodes.ModeIndirect, 0x6C);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rPC = cpu.addrIndirect();
        }
    }
    registeredOperations.push(JmpIndirect);

    export class JmpAbsolute extends BaseOpCode {
        constructor() {
            super("JMP", 0x03, OpCodes.ModeAbsolute, 0x4C);
        }
        public execute(cpu: Emulator.ICpu) {
            var newAddress: number = cpu.addrPopWord();
            cpu.rPC = newAddress;
        }
    }
    registeredOperations.push(JmpAbsolute);

    export class JmpSubroutineAbsolute extends BaseOpCode {
        constructor() {
            super("JSR", 0x03, OpCodes.ModeAbsolute, 0x20);
        }
        public execute(cpu: Emulator.ICpu) {
            var newAddress: number = cpu.addrPopWord();
            cpu.stackPush(((cpu.rPC - 1) >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
            cpu.stackPush((cpu.rPC - 1) & (Constants.Memory.ByteMask));
            cpu.rPC = newAddress;
        }
    }
    registeredOperations.push(JmpSubroutineAbsolute);

    export class LoadAccumulatorImmediate extends BaseOpCode {
        constructor() {
            super("LDA", 0x02, OpCodes.ModeImmediate, 0xA9);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.addrPop();
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(LoadAccumulatorImmediate);

    export class LoadAccumulatorAbsolute extends BaseOpCode {
        constructor() {
            super("LDA", 0x03, OpCodes.ModeAbsolute, 0xAD);
        }
        public execute(cpu: Emulator.ICpu) {
            var memory: number = cpu.addrPopWord();
            cpu.rA = cpu.peek(memory);
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(LoadAccumulatorAbsolute);

    export class LoadAccumulatorAbsoluteX extends BaseOpCode {
        constructor() {
            super("LDA", 0x03, OpCodes.ModeAbsoluteX, 0xBD);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(LoadAccumulatorAbsoluteX);

    export class LoadAccumulatorZeroPage extends BaseOpCode {
        constructor() {
            super("LDA", 0x02, OpCodes.ModeZeroPage, 0xA5);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(LoadAccumulatorZeroPage);

    export class LoadAccumulatorIndexedIndirectY extends BaseOpCode {
        constructor() {
            super("LDA", 0x02, OpCodes.ModeIndexedIndirectY, 0xB1);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(LoadAccumulatorIndexedIndirectY);

    export class LoadYRegisterAbsolute extends BaseOpCode {
        constructor() {
            super("LDY", 0x03, OpCodes.ModeAbsolute, 0xAC);
        }
        public execute(cpu: Emulator.ICpu) {
            var target: number = cpu.addrPopWord();
            cpu.rY = cpu.peek(target);
            cpu.setFlags(cpu.rY);
        }
    }
    registeredOperations.push(LoadYRegisterAbsolute);

    export class LoadYRegisterImmediate extends BaseOpCode {
        constructor() {
            super("LDY", 0x02, OpCodes.ModeImmediate, 0xA0);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rY = cpu.addrPop();
            cpu.setFlags(cpu.rY);
        }
    }
    registeredOperations.push(LoadYRegisterImmediate);

    export class LoadYRegisterZeroPage extends BaseOpCode {
        constructor() {
            super("LDY", 0x02, OpCodes.ModeZeroPage, 0xA4);
        }
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            cpu.rY = cpu.peek(zeroPage);
            cpu.setFlags(cpu.rY);
        }
    }
    registeredOperations.push(LoadYRegisterZeroPage);

    export class LoadXRegisterImmediate implements IOperation {

        public opName: string = "LDX";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }
        
        public addressingMode: number = OpCodes.ModeImmediate; 
        public opCode: number = 0xa2; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = cpu.addrPop();
            cpu.setFlags(cpu.rX);
        }
    }

    registeredOperations.push(LoadXRegisterImmediate);

    export class LoadXRegisterZeroPage implements IOperation {

        public opName: string = "LDX";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToByte(bytes[1]));
        }
        
        public addressingMode: number = OpCodes.ModeZeroPage; 
        public opCode: number = 0xa6; 
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            cpu.rX = cpu.peek(zeroPage);
            cpu.setFlags(cpu.rX);
        }
    }

    registeredOperations.push(LoadXRegisterZeroPage);

    /* =========== 
       === NOP === 
       =========== */

    export class NoOperationSingle extends BaseOpCode {
        constructor() {
            super("NOP", 0x01, OpCodes.ModeSingle, 0xEA);
        }
        public execute(cpu: Emulator.ICpu) {
            return; 
        }
    }
    registeredOperations.push(NoOperationSingle);

    /* =========== 
       === ORA === 
       =========== */

    export class OrImmediate extends BaseOpCode {
        constructor() {
            super("ORA", 0x02, OpCodes.ModeImmediate, 0x09);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.addrPop();
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrImmediate);

    export class OrZeroPage extends BaseOpCode {
        constructor() {
            super("ORA", 0x02, OpCodes.ModeZeroPage, 0x05);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrZeroPage);

    export class OrZeroPageX extends BaseOpCode {
        constructor() {
            super("ORA", 0x02, OpCodes.ModeZeroPageX, 0x15);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrZeroPageX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrZeroPageX);

    export class OrAbsolute extends BaseOpCode {
        constructor() {
            super("ORA", 0x03, OpCodes.ModeAbsolute, 0x0D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrPopWord());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrAbsolute);

    export class OrAbsoluteX extends BaseOpCode {
        constructor() {
            super("ORA", 0x03, OpCodes.ModeAbsoluteX, 0x1D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrAbsoluteX);

    export class OrAbsoluteY extends BaseOpCode {
        constructor() {
            super("ORA", 0x03, OpCodes.ModeAbsoluteY, 0x19);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrAbsoluteY());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrAbsoluteY);

    export class OrIndirectX extends BaseOpCode {
        constructor() {
            super("ORA", 0x02, OpCodes.ModeIndexedIndirectX, 0x01);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrIndirectX);

    export class OrIndirectY extends BaseOpCode {
        constructor() {
            super("ORA", 0x02, OpCodes.ModeIndexedIndirectY, 0x11);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA | cpu.peek(cpu.addrIndirectIndexedY());
            cpu.setFlags(cpu.rA);
        }
    }    
    registeredOperations.push(OrIndirectY);

    /* ===========
       === RTS ===
       =========== */

    export class RtsSingle extends BaseOpCode {
        constructor() {
            super("RTS", 0x01, OpCodes.ModeSingle, 0x60);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.stackRts();
        }
    }
    registeredOperations.push(RtsSingle);

    /* ==========================
       === Stack Instructions ===
       ========================== */

    export class PullProcessorStatusSingle extends BaseOpCode {
        constructor() {
            super("PLP", 0x01, OpCodes.ModeSingle, 0x28);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rP = cpu.stackPop();            
        }
    }
    registeredOperations.push(PullProcessorStatusSingle);

    export class PushProcessorStatusSingle extends BaseOpCode {
        constructor() {
            super("PHP", 0x01, OpCodes.ModeSingle, 0x08);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.stackPush(cpu.rP);
        }
    }
    registeredOperations.push(PushProcessorStatusSingle);

    export class PullAccumulatorSingle extends BaseOpCode {
        constructor() {
            super("PLA", 0x01, OpCodes.ModeSingle, 0x68);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.stackPop();
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(PullAccumulatorSingle);

    export class PushAccumulatorSingle extends BaseOpCode {
        constructor() {
            super("PHA", 0x01, OpCodes.ModeSingle, 0x48);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.stackPush(cpu.rA);
        }
    }
    registeredOperations.push(PushAccumulatorSingle);

    export class TransferXRegisterToStackPointerSingle extends BaseOpCode {
        constructor() {
            super("TXS", 0x01, OpCodes.ModeSingle, 0x9A);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rSP = cpu.rX; 
        }
    }
    registeredOperations.push(TransferXRegisterToStackPointerSingle);

    export class TransferStackPointerToXRegisterSingle extends BaseOpCode {
        constructor() {
            super("TSX", 0x01, OpCodes.ModeSingle, 0xBA);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = cpu.rSP; 
        }
    }
    registeredOperations.push(TransferStackPointerToXRegisterSingle);


    /* ===========
       === STA ===
       =========== */

    export class StoreAccumulatorAbsolute extends BaseOpCode {
        constructor() {
            super("STA", 0x03, OpCodes.ModeAbsolute, 0x8D);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetAddress: number = cpu.addrPopWord();
            cpu.poke(targetAddress, cpu.rA);
        }
    }
    registeredOperations.push(StoreAccumulatorAbsolute);

    export class StoreAccumulatorAbsoluteX extends BaseOpCode {
        constructor() {
            super("STA", 0x03, OpCodes.ModeAbsoluteX, 0x9D);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrAbsoluteX(), cpu.rA);
        }
    }
    registeredOperations.push(StoreAccumulatorAbsoluteX);

    export class StoreAccumulatorAbsoluteY extends BaseOpCode {
        constructor() {
            super("STA", 0x03, OpCodes.ModeAbsoluteY, 0x99);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrAbsoluteY(), cpu.rA);
        }
    }
    registeredOperations.push(StoreAccumulatorAbsoluteY);

    export class StoreAccumulatorIndirectY extends BaseOpCode {
        constructor() {
            super("STA", 0x02, OpCodes.ModeIndexedIndirectY, 0x91);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrIndirectIndexedY(), cpu.rA);
        }
    }
    registeredOperations.push(StoreAccumulatorIndirectY);
    
    export class StoreAccumulatorIndirectX extends BaseOpCode {
        constructor() {
            super("STA", 0x02, OpCodes.ModeIndexedIndirectX, 0xA1);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrIndexedIndirectX(), cpu.rA);
        }
    }
    registeredOperations.push(StoreAccumulatorIndirectX);
    
    export class StoreAccumulatorZeroPage extends BaseOpCode {
        constructor() {
            super("STA", 0x02, OpCodes.ModeZeroPage, 0x85);
        }
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            cpu.poke(zeroPage, cpu.rA);
        }
    }
    registeredOperations.push(StoreAccumulatorZeroPage);

    export class StoreYRegisterAbsolute extends BaseOpCode {
        constructor() {
            super("STY", 0x03, OpCodes.ModeAbsolute, 0x8C);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetAddress: number = cpu.addrPopWord();
            cpu.poke(targetAddress, cpu.rY);
        }
    }
    registeredOperations.push(StoreYRegisterAbsolute);

    /* ===========
       === SBC ===
       =========== */
    
    export class SubtractWithCarryImmediate extends BaseOpCode {
        constructor() {
            super("SBC", 0x02, OpCodes.ModeImmediate, 0xE9);
        }
        public execute(cpu: Emulator.ICpu) {
            OpCodes.SubtractWithCarry(cpu, cpu.addrPop());
        }
    }    
    registeredOperations.push(SubtractWithCarryImmediate);
    
    export class SubtractWithCarryZeroPage extends BaseOpCode {
        constructor() {
            super("SBC", 0x02, OpCodes.ModeZeroPage, 0xE5);
        }        
        public execute(cpu: Emulator.ICpu) {
            var zeroPage = cpu.addrPop();
            OpCodes.SubtractWithCarry(cpu, cpu.peek(zeroPage));
        }
    }    
    registeredOperations.push(SubtractWithCarryZeroPage);
    
    export class SubtractWithCarryZeroPageX extends BaseOpCode {
        constructor() {
            super("SBC", 0x02, OpCodes.ModeZeroPageX, 0xF5);
        }
        public execute(cpu: Emulator.ICpu) {
            OpCodes.SubtractWithCarry(cpu, cpu.peek(cpu.addrZeroPageX()));
        }
    }    
    registeredOperations.push(SubtractWithCarryZeroPageX);
    
    export class SubtractWithCarryAbsolute extends BaseOpCode {
        constructor() {
            super("SBC", 0x03, OpCodes.ModeAbsolute, 0xED);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(SubtractWithCarryAbsolute);

    export class SubtractWithCarryAbsoluteX extends BaseOpCode {
        constructor() {
            super("SBC", 0x03, OpCodes.ModeAbsoluteX, 0xFD);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrAbsoluteX());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(SubtractWithCarryAbsoluteX);

    export class SubtractWithCarryAbsoluteY extends BaseOpCode {
        constructor() {
            super("SBC", 0x03, OpCodes.ModeAbsoluteY, 0xF9);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrAbsoluteY());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(SubtractWithCarryAbsoluteY);

    export class SubtractWithCarryIndexedIndirectX extends BaseOpCode {
        constructor() {
            super("SBC", 0x02, OpCodes.ModeIndexedIndirectX, 0xE1);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrIndexedIndirectX());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(SubtractWithCarryIndexedIndirectX);

    export class SubtractWithCarryIndirectIndexedY extends BaseOpCode {
        constructor() {
            super("SBC", 0x02, OpCodes.ModeIndexedIndirectY, 0xF1);
        }
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrIndirectIndexedY());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        }
    }    
    registeredOperations.push(SubtractWithCarryIndirectIndexedY);   

    export class TransferAccumulatorToXSingle extends BaseOpCode {
        constructor() {
            super("TAX", 0x01, OpCodes.ModeSingle, 0xAA);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = cpu.rA;
            cpu.setFlags(cpu.rX);
        }
    }
    registeredOperations.push(TransferAccumulatorToXSingle);

    export class TransferAccumulatorToYSingle extends BaseOpCode {
        constructor() {
            super("TAY", 0x01, OpCodes.ModeSingle, 0xA8);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rY = cpu.rA;
            cpu.setFlags(cpu.rY);
        }
    }
    registeredOperations.push(TransferAccumulatorToYSingle);

    export class TransferXToAccumulatorSingle extends BaseOpCode {
        constructor() {
            super("TXA", 0x01, OpCodes.ModeSingle, 0x8A);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rX;
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(TransferXToAccumulatorSingle);

    export class TransferYToAccumulatorSingle extends BaseOpCode {
        constructor() {
            super("TYA", 0x01, OpCodes.ModeSingle, 0x98);
        }
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rY;
            cpu.setFlags(cpu.rA);
        }
    }
    registeredOperations.push(TransferYToAccumulatorSingle);
}