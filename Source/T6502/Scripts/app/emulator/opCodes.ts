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
            var temp: number = src + cpu.rA + (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0);
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                if (((cpu.rA & 0xF) + (src & 0xF) + (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 1 : 0)) > 9) {
                    temp += 6;                    
                }
                var overFlow: boolean = !(((cpu.rA ^ src) & 0x80) > 0) && ((cpu.rA ^ temp) & 0x80) > 0;
                cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, overFlow);
                if (temp > 0x99) {
                    temp += 96;
                }    
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, (temp > 0x99));
            }
            else {
                var overFlow: boolean = !(((cpu.rA ^ src) & 0x80) > 0) && ((cpu.rA ^ temp) & 0x80) > 0;
                cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, (temp > Constants.Memory.ByteMask));
            }
            cpu.rA = temp & Constants.Memory.ByteMask; 
            cpu.setFlags(cpu.rA);
        }

        public static SubtractWithCarry(cpu: Emulator.ICpu, src: number) {
            var temp: number = cpu.rA - src - (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 0 : 1);
            cpu.setFlags(temp);
            cpu.setFlag(Constants.ProcessorStatus.OverflowFlagSet, (((cpu.rA ^ temp) & 0x80) > 0) && 
                (((cpu.rA ^ src) & 0x80) > 0));
            if (cpu.checkFlag(Constants.ProcessorStatus.DecimalFlagSet)) {
                if ( ((cpu.rA & 0xF)  - (cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet) ? 0 : 1)) 
                    < (src & 0x0F) ) {
                    temp -= 6;
                }
                if (temp > 0x99) {
                    temp -= 0x60;
                }
            }
            cpu.setFlag(Constants.ProcessorStatus.CarryFlagSet, (temp < 0x100)); 
            cpu.rA = temp & Constants.Memory.ByteMask; 
        }
    }   

    export class AddWithCarryImmediate implements IOperation {
        public opName: string = "ADC";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }
        
        addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0x69; 
        public execute(cpu: Emulator.ICpu) {
            OpCodes.AddWithCarry(cpu, cpu.addrPop());
        }
    }
    
    registeredOperations.push(AddWithCarryImmediate);
    
    export class AddWithCarryAbsolute implements IOperation {
        public opName: string = "ADC";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
        
        addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0x6d; 
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            OpCodes.AddWithCarry(cpu, targetValue);
        }
    }
    
    registeredOperations.push(AddWithCarryAbsolute);

    export class AndImmediate implements IOperation {
        
        public opName: string = "AND";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }
        
        addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0x29; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rA & cpu.addrPop();
            cpu.setFlags(cpu.rA);
        }
    }
    
    registeredOperations.push(AndImmediate);

    export class BranchNotEqualRelative implements IOperation {
        
        public opName: string = "BNE";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0xd0; 
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchNotEqualRelative);

    export class BranchEqualRelative implements IOperation {
        
        public opName: string = "BEQ";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0xf0; 
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchEqualRelative);
    
    export class BranchMinusRelative implements IOperation {
        
        public opName: string = "BMI";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0x30; 
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchMinusRelative);

    export class BranchPlusRelative implements IOperation {
        
        public opName: string = "BPL";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0x10; 
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchPlusRelative);

    export class BranchOverflowClearRelative implements IOperation {
        
        public opName: string = "BVC";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0x50; 
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchOverflowClearRelative);

    export class BranchOverflowSetRelative implements IOperation {
        
        public opName: string = "BVS";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0x70; 
        public execute(cpu: Emulator.ICpu) {
            var branch: number = cpu.addrPop();
            if (cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchOverflowSetRelative);
    
    export class BranchCarryClearRelative implements IOperation {
        
        public opName: string = "BCC";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0x90; 
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchCarryClearRelative);

    export class BranchCarrySetRelative implements IOperation {
        
        public opName: string = "BCS";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(OpCodes.computeBranch(address + 2, bytes[1])));
        }
        
        addressingMode: number = OpCodes.ModeRelative;
        public opCode: number = 0xB0; 
        public execute(cpu: Emulator.ICpu) {
            var branch = cpu.addrPop();
            if (!cpu.checkFlag(Constants.ProcessorStatus.CarryFlagSet)) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchCarrySetRelative);

    export class ClearDecimalSingle implements IOperation {
        
        public opName: string = "CLD";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xD8; 
        public execute(cpu: Emulator.ICpu) {
            cpu.setFlag(Constants.ProcessorStatus.DecimalFlagSet, false);
        }
    }
    
    registeredOperations.push(ClearDecimalSingle);

    export class CompareAccumulatorImmediate implements IOperation {

        public opName: string = "CMP";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }

        public addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0xc9;
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rA, cpu.addrPop());
        }
    }

    registeredOperations.push(CompareAccumulatorImmediate);


    export class CompareXImmediate implements IOperation {

        public opName: string = "CPX";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }

        public addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0xe0;
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rX, cpu.addrPop());
        }
    }

    registeredOperations.push(CompareXImmediate);

    export class CompareYImmediate implements IOperation {

        public opName: string = "CPY";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }

        public addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0xC0;
        public execute(cpu: Emulator.ICpu) {
            cpu.compareWithFlags(cpu.rY, cpu.addrPop());
        }
    }

    registeredOperations.push(CompareYImmediate);

    export class DecXSingle implements IOperation {
        
        public opName: string = "DEX";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xCA;
        public execute(cpu: Emulator.ICpu) {
            cpu.rX -= 1;
            if (cpu.rX < 0) {
                cpu.rX = Constants.Memory.ByteMask;
            }
            cpu.setFlags(cpu.rX);
        }
    }

    registeredOperations.push(DecXSingle);

    export class DecYSingle implements IOperation {
        
        public opName: string = "DEY";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0x88;
        public execute(cpu: Emulator.ICpu) {
            cpu.rY -= 1;
            if (cpu.rY < 0) {
                cpu.rY = Constants.Memory.ByteMask;
            }
            cpu.setFlags(cpu.rY);
        }
    }

    registeredOperations.push(DecYSingle);

    export class ExclusiveOrIndirectX implements IOperation {
        
        public opName: string = "EOR";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "($" + OpCodes.ToByte(bytes[1]) + ", X)");
        }
        
        public addressingMode: number = OpCodes.ModeIndexedIndirectX;
        public opCode: number = 0x41;
        public execute(cpu: Emulator.ICpu) {
            cpu.rA ^= cpu.peek(cpu.addrIndexedIndirectX());
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(ExclusiveOrIndirectX);

    export class InvalidOp implements IOperation {
        
        public opName: string = "???";
        public sizeBytes: number = 0x01;
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                    OpCodes.ToWord(address),
                    this.opName, 
                    "");               
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number;

        constructor(value: number) {
            this.opCode = value & Constants.Memory.ByteMask;
        }

        public execute(cpu: Emulator.ICpu) {
            var prev = cpu.rPC - 1;
            var opCode = cpu.peek(prev);
            throw "Invalid op code 0x" + opCode.toString(16).toUpperCase() +
                 " encountered at $" + prev.toString(16).toUpperCase();
        }
    }

    export class IncAbsolute implements IOperation {
        
        public opName: string = "INC";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
        
        public addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0xee;
        public execute(cpu: Emulator.ICpu) {
            var target: number = cpu.addrPopWord();
            var value: number = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        }
    }

    registeredOperations.push(IncAbsolute);

    export class IncAbsoluteX implements IOperation {
        
        public opName: string = "INC";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
        }
        
        public addressingMode: number = OpCodes.ModeAbsoluteX;
        public opCode: number = 0xfe;
        public execute(cpu: Emulator.ICpu) {
            var target: number = cpu.addrAbsoluteX();
            var value: number = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        }
    }

    registeredOperations.push(IncAbsoluteX);

    export class IncXSingle implements IOperation {
        
        public opName: string = "INX";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xe8;
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = ((cpu.rX) + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rX);
        }
    }

    registeredOperations.push(IncXSingle);

    export class IncYSingle implements IOperation {
        
        public opName: string = "INY";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xC8;
        public execute(cpu: Emulator.ICpu) {
            cpu.rY = ((cpu.rY) + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rY);
        }
    }

    registeredOperations.push(IncYSingle);

    export class IncZeroPage implements IOperation {
        
        public opName: string = "INC";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToByte(bytes[1]));
        }

        public addressingMode: number = OpCodes.ModeZeroPage;
        public opCode: number = 0xe6;
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            var value: number = cpu.peek(zeroPage);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(zeroPage, value);
            cpu.setFlags(value);
        }
    }

    registeredOperations.push(IncZeroPage);

    export class IncrementX implements IOperation {
        
        public opName: string = "INX";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }

        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xe8;
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = (cpu.rX + 1) & Constants.Memory.ByteMask;
            cpu.setFlags(cpu.rX);
        }
    }

    registeredOperations.push(IncrementX);

    export class JmpIndirect implements IOperation {
        
        public opName:string = "JMP";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "($" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ")");
        }
        
        public addressingMode: number = OpCodes.ModeIndirect;
        public opCode: number = 0x6c;
        public execute(cpu: Emulator.ICpu) {
            cpu.rPC = cpu.addrIndirect();
        }
    }

    registeredOperations.push(JmpIndirect);

    export class JmpAbsolute implements IOperation {
        
        public opName:string = "JMP";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
        
        public addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0x4c;
        public execute(cpu: Emulator.ICpu) {
            var newAddress: number = cpu.addrPopWord();
            cpu.rPC = newAddress;
        }
    }

    registeredOperations.push(JmpAbsolute);

    export class JmpSubroutineAbsolute implements IOperation {
        
        public opName:string = "JSR";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
        
        public addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0x20;
        public execute(cpu: Emulator.ICpu) {
            var newAddress: number = cpu.addrPopWord();
            cpu.stackPush(((cpu.rPC - 1) >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
            cpu.stackPush((cpu.rPC - 1) & (Constants.Memory.ByteMask));
            cpu.rPC = newAddress;
        }
    }

    registeredOperations.push(JmpSubroutineAbsolute);

    export class LoadAccumulatorImmediate implements IOperation {
        
        public opName: string = "LDA";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }
        
        public addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0xa9;
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.addrPop();
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(LoadAccumulatorImmediate);

    export class LoadAccumulatorAbsolute implements IOperation {
        
        public opName: string = "LDA";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
        
        public addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0xad;
        public execute(cpu: Emulator.ICpu) {
            var memory: number = cpu.addrPopWord();
            cpu.rA = cpu.peek(memory);
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(LoadAccumulatorAbsolute);

    export class LoadAccumulatorAbsoluteX implements IOperation {
        
        public opName: string = "LDA";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
        }
        
        public addressingMode: number = OpCodes.ModeAbsoluteX;
        public opCode: number = 0xbd;
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.peek(cpu.addrAbsoluteX());
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(LoadAccumulatorAbsoluteX);

    export class LoadAccumulatorZeroPage implements IOperation {
        
        public opName: string = "LDA";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToByte(bytes[1]));
        }
        
        public addressingMode: number = OpCodes.ModeZeroPage;
        public opCode: number = 0xa5;
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.peek(cpu.addrPop());
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(LoadAccumulatorZeroPage);

    export class LoadYRegisterAbsolute implements IOperation {
        
        public opName: string = "LDY";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
                
        public addressingMode: number = OpCodes.ModeAbsolute; 
        public opCode: number = 0xac; 
        public execute(cpu: Emulator.ICpu) {
            var target: number = cpu.addrPopWord();
            cpu.rY = cpu.peek(target);
            cpu.setFlags(cpu.rY);
        }
    }

    registeredOperations.push(LoadYRegisterAbsolute);

    export class LoadYRegisterImmediate implements IOperation {
        
        public opName: string = "LDY";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }
        
        
        public addressingMode: number = OpCodes.ModeImmediate; 
        public opCode: number = 0xa0; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rY = cpu.addrPop();
            cpu.setFlags(cpu.rY);
        }
    }

    registeredOperations.push(LoadYRegisterImmediate);

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

    export class PullAccumulatorSingle implements IOperation {

        public opName: string = "PLA";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0x68;
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.stackPop();
        }
    }

    registeredOperations.push(PullAccumulatorSingle);

    export class PushAccumulatorSingle implements IOperation {

        public opName: string = "PHA";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0x48;
        public execute(cpu: Emulator.ICpu) {
            cpu.stackPush(cpu.rA);
        }
    }

    registeredOperations.push(PushAccumulatorSingle);

    export class RtsSingle implements IOperation {

        public opName: string = "RTS";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }
        
        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0x60;
        public execute(cpu: Emulator.ICpu) {
            cpu.stackRts();
        }
    }

    registeredOperations.push(RtsSingle);

    export class StoreAccumulatorAbsolute implements IOperation {

        public opName: string = "STA";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }        

        public addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0x8d; 
        public execute(cpu: Emulator.ICpu) {
            var targetAddress: number = cpu.addrPopWord();
            cpu.poke(targetAddress, cpu.rA);
        }
    }

    registeredOperations.push(StoreAccumulatorAbsolute);

    export class StoreAccumulatorAbsoluteX implements IOperation {

        public opName: string = "STA";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", X");
        }        

        public addressingMode: number = OpCodes.ModeAbsoluteX;
        public opCode: number = 0x9d; 
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrAbsoluteX(), cpu.rA);
        }
    }

    registeredOperations.push(StoreAccumulatorAbsoluteX);

    export class StoreAccumulatorAbsoluteY implements IOperation {

        public opName: string = "STA";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)) + ", Y");
        }        

        public addressingMode: number = OpCodes.ModeAbsoluteY;
        public opCode: number = 0x99; 
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrAbsoluteY(), cpu.rA);
        }
    }

    registeredOperations.push(StoreAccumulatorAbsoluteY);

    export class StoreAccumulatorIndirectY implements IOperation {

        public opName: string = "STA";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "($" + OpCodes.ToByte(bytes[1]) + "), Y");
        }        

        public addressingMode: number = OpCodes.ModeIndexedIndirectY;
        public opCode: number = 0x91; 
        public execute(cpu: Emulator.ICpu) {
            cpu.poke(cpu.addrIndirectIndexedY(), cpu.rA);
        }
    }

    registeredOperations.push(StoreAccumulatorIndirectY);
    
    export class StoreAccumulatorZeroPage implements IOperation {

        public opName: string = "STA";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToByte(bytes[1]));
        }        

        public addressingMode: number = OpCodes.ModeZeroPage;
        public opCode: number = 0x85; 
        public execute(cpu: Emulator.ICpu) {
            var zeroPage: number = cpu.addrPop();
            cpu.poke(zeroPage, cpu.rA);
        }
    }

    registeredOperations.push(StoreAccumulatorZeroPage);

    export class SubtractWithCarryImmediate implements IOperation {
        public opName: string = "SBC";
        public sizeBytes: number = 0x02; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "#$" + OpCodes.ToByte(bytes[1]));
        }
        
        addressingMode: number = OpCodes.ModeImmediate;
        public opCode: number = 0xe9; 
        public execute(cpu: Emulator.ICpu) {
            OpCodes.SubtractWithCarry(cpu, cpu.addrPop());
        }
    }
    
    registeredOperations.push(SubtractWithCarryImmediate);
    
    export class SubtractWithCarryAbsolute implements IOperation {
        public opName: string = "SBC";
        public sizeBytes: number = 0x03; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "$" + OpCodes.ToWord(bytes[1] + (bytes[2] << Constants.Memory.BitsInByte)));
        }
        
        addressingMode: number = OpCodes.ModeAbsolute;
        public opCode: number = 0xed; 
        public execute(cpu: Emulator.ICpu) {
            var targetValue: number = cpu.peek(cpu.addrPopWord());
            OpCodes.SubtractWithCarry(cpu, targetValue);
        }
    }
    
    registeredOperations.push(SubtractWithCarryAbsolute);


    export class TransferAccumulatorToXSingle implements IOperation {

        public opName: string = "TAX";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }        

        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xAA; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rX = cpu.rA;
            cpu.setFlags(cpu.rX);
        }
    }

    registeredOperations.push(TransferAccumulatorToXSingle);

    export class TransferAccumulatorToYSingle implements IOperation {

        public opName: string = "TAY";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }        

        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0xA8; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rY = cpu.rA;
            cpu.setFlags(cpu.rY);
        }
    }

    registeredOperations.push(TransferAccumulatorToYSingle);

    export class TransferXToAccumulatorSingle implements IOperation {

        public opName: string = "TXA";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }        

        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0x8A; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rX;
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(TransferXToAccumulatorSingle);

    export class TransferYToAccumulatorSingle implements IOperation {

        public opName: string = "TYA";
        public sizeBytes: number = 0x01; 
        public decompile (address: number, bytes: number[]): string {
            return OpCodes.ToDecompiledLine(
                OpCodes.ToWord(address),
                this.opName,
                "");
        }        

        public addressingMode: number = OpCodes.ModeSingle;
        public opCode: number = 0x98; 
        public execute(cpu: Emulator.ICpu) {
            cpu.rA = cpu.rY;
            cpu.setFlags(cpu.rA);
        }
    }

    registeredOperations.push(TransferYToAccumulatorSingle);
}