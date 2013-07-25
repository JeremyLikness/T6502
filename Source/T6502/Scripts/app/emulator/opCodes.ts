///<reference path="cpu.ts"/>
///<reference path="compiler.ts"/>

module Emulator {

    export interface IOperation {
        execute(cpu: ICpu);
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
    }

    export class BranchNotEqual implements IOperation {
        
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
            var branch = cpu.addrPop();
            if ((cpu.rP & Constants.ProcessorStatus.ZeroFlagSet) === 0x0) {                
                cpu.rPC = OpCodes.computeBranch(cpu.rPC, branch);
            }
        }
    }
    
    registeredOperations.push(BranchNotEqual);

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
            var zeroPage: number = (cpu.addrPop() + cpu.rX) & Constants.Memory.ByteMask;
            var value: number = cpu.peek(zeroPage) + (cpu.peek(zeroPage + 1) << Constants.Memory.BitsInByte);
            cpu.rA ^= cpu.peek(value);
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
            var target: number = cpu.addrPopWord() + cpu.rX;            
            var value: number = cpu.peek(target);
            value = (value + 1) & Constants.Memory.ByteMask;
            cpu.poke(target, value);
            cpu.setFlags(value);
        }
    }

    registeredOperations.push(IncAbsoluteX);

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
            var targetAddress: number = cpu.addrPopWord() + cpu.rY;
            cpu.poke(targetAddress, cpu.rA);
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
            var zeroPage: number = cpu.addrPop();
            var target: number = cpu.peek(zeroPage) + (cpu.peek(zeroPage + 1) << Constants.Memory.BitsInByte)
                + cpu.rY; 
            cpu.poke(target, cpu.rA);
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
}