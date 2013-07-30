///<reference path="../app.ts"/>
///<reference path="../services/consoleService.ts"/>
///<reference path="../services/displayService.ts"/>
///<reference path="opCodes.ts"/>

module Emulator {

    export interface IOpcodeSupport {
        addrAbsoluteX(): number;
        addrAbsoluteY(): number; 
        addrIndirect(): number;
        addrIndexedIndirectX(): number;
        addrIndirectIndexedY(): number;
    }

    export interface ICpu extends IOpcodeSupport {

        debug: boolean;

        rA: number;
        rX: number;
        rY: number;
        rP: number;
        rPC: number;
        rSP: number;

        started: Date; 
        elapsedMilliseconds: number;
        instructionsPerSecond: number;

        autoRefresh: bool;
        runningState: bool; 
        errorState: bool;
        log(msg: string): void;
        reset(): void;
        halt(): void;
        stop(): void;
        run(): void;
        
        addrPop(): number;
        addrPopWord(): number; 
        stackPush(value: number): bool;
        stackPop(): number;
        stackRts(): void;
        poke(address: number, value: number): void;
        peek(address: number): number;
        setFlags(value: number): void;
        compareWithFlags(registerValue: number, value: number): void;
        setFlag(flag: number, setFlag: boolean);    
        checkFlag(flag: number): boolean;
    }

    export interface ICpuExtended extends ICpu {
        getOperation(value: number): IOperation;        
    }

    export class Cpu implements ICpuExtended {
            
        public debug: boolean; 

        public rA: number;
        public rX: number;
        public rY: number;
        public rP: number;
        public rPC: number;
        public rSP: number;
        public cycles: number;

        public started: Date;
        public elapsedMilliseconds: number;
        public instructionsPerSecond: number;

        public autoRefresh: bool;
        public runningState: bool;
        public errorState: bool;

        public log: (msg: string) => void;

        private memory: number[] = new Array (Constants.Memory.Size);
        private consoleService: Services.IConsoleService;
        private displayService: Services.IDisplayService;
        private timeoutService: ng.ITimeoutService;
        private runner: ng.IPromise = null;        
        private instructions: number = 0;
        private lastCheck: number = 0;

        private operationMap: IOperation[] = [];

        constructor(
            consoleService: Services.IConsoleService,
            displayService: Services.IDisplayService,
            timeoutService: ng.ITimeoutService) {
            this.consoleService = consoleService;
            this.displayService = displayService;
            this.log = msg => this.consoleService.log(msg);
            this.timeoutService = timeoutService;
            OpCodes.FillOps(this.operationMap);
            this.autoRefresh = true;
            this.debug = false;
            this.reset();
        }

        public stop(): void {
            this.runningState = false;

            if (this.runner != null) {
                this.timeoutService.cancel(this.runner);
                this.runner = null;
            }
        }

        public halt(): void {
            this.stop();
            this.errorState = true;
            this.consoleService.log("Processing has been halted. RESET to continue.");
        }

        public reset(): void {
        
            var idx: number; 

            this.rA = 0x00;
            this.rX = 0x00;
            this.rY = 0x00;
            this.rP = 0x00;
            this.rPC = Constants.Memory.DefaultStart;
            this.rSP = Constants.Memory.Stack; 
            
            this.started = null;
            this.elapsedMilliseconds = 0;
            this.instructionsPerSecond = 0;
            this.lastCheck = null;
            this.instructions = 0;

            for (idx = 0; idx < this.memory.length; idx++) {
                this.memory[idx] = 0x00;
            }

            // reset the display 
            for (idx = 0; idx < this.displayService.pixels.length; idx++) {
                if (this.displayService.pixels[idx] !== 0x0) {
                    this.displayService.draw(idx, 0x0);
                }
            }
                       
            this.runningState = false;
            this.errorState = false;

            this.consoleService.log("CPU has been successfully reset.");
        }

        // kicks of the execution of code
        public run(): void {            
            if (this.runningState) {
                this.consoleService.log("Already running.");
                return;
            }

            if (this.errorState) {
                this.consoleService.log("Cannot run in error state. Please RESET first.");
                return;
            }

            this.runningState = true;
            this.started = new Date();
            this.lastCheck = this.started.getTime();

            this.runner = this.timeoutService(() => this.executeBatch.apply(this), 1, this.autoRefresh);                            
        }

        // this is the main execution loop that pauses every few sets to allow events, etc.
        // to be processed. Adjust the number of instructions down if the app is not responsive
        private executeBatch() {
            if (!this.runningState || this.errorState) {
                return;
            }

            var instructions: number = 0xff;
            while (instructions--) {
                this.execute();
            }

            // run again
            this.runner = this.timeoutService(() => this.executeBatch.apply(this), 0, this.autoRefresh);            

            var now = new Date();
            this.elapsedMilliseconds = now.getTime() - this.started.getTime();

            if (now.getTime() - this.lastCheck > 1000) {
                this.instructionsPerSecond = this.instructions;
                this.instructions = 0;
                this.lastCheck = now.getTime();
            }
        }

        // main loop - op codes update their own program counter so this just contiuously
        // grabs an instruction, runs it, and grabs the next
        private execute(): void {
            if (!this.runningState || this.errorState) {
                return;
            }

            try {
                var oldAddress: number = this.rPC; 
                var op: IOperation = this.operationMap[this.addrPop()];

                if (this.debug) {
                    this.consoleService.log(op.decompile(
                        oldAddress, [
                            op.opCode, 
                            this.memory[oldAddress + 1],
                            this.memory[oldAddress + 2]
                        ]));
                }
                
                op.execute(this);                
            }
            catch(exception) {
                this.consoleService.log("Unexpected exception: " + exception);
                this.halt();
            }

            // track instructions per second 
            this.instructions += 1;                                  
        }

        public checkFlag(flag: number): boolean {
            return (this.rP & flag) > 0; 
        }

        public setFlag(flag: number, setFlag: boolean) {
            var resetFlag: number = Constants.Memory.ByteMask - flag; 
            if (setFlag) {
                this.rP |= flag;
            }
            else {
                this.rP &= resetFlag;
            }
        }

        // push a value to the stack or throw an exception when full
        public stackPush(value: number): bool {
        
            if (this.rSP >= 0x0) {
                this.rSP -= 1;
                this.memory[this.rSP + Constants.Memory.Stack] = value;     
                return true;
            }
            else {
                throw "Stack overflow.";
                return false;
            }
        } 
        
        // pop a value from the stack or throw an exception when empty
        public stackPop(): number {
            if (this.rSP < Constants.Memory.Stack) {
                var value: number = this.memory[this.rSP + Constants.Memory.Stack];
                this.rSP++;
                return value;
            }
            else {
                throw "Tried to pop empty stack.";
                return 0;
            }
        }

        // execute a "return from subroutine" by popping the return value from the stack
        public stackRts(): void {
            this.rPC = this.stackPop() + 0x01 + (this.stackPop() << Constants.Memory.BitsInByte);
        }

        // pop the address and increment the PC 
        addrPop(): number {
            var value: number = this.peek(this.rPC);
            this.rPC += 1;
            return value;
        }

        // grab a word, low byte first 
        addrPopWord(): number {
            var word = this.addrPop() + (this.addrPop() << Constants.Memory.BitsInByte);
            return word;
        }

        // set a value. Will recognize when a value is set in display memory and 
        // use the display service to update that
        poke(address: number, value: number): void {
            this.memory[address & Constants.Memory.Max] = value & Constants.Memory.ByteMask;
            if (address >= Constants.Display.DisplayStart && address <= Constants.Display.DisplayStart + Constants.Display.Max) {
                this.displayService.draw(address, value);
            }
        }

        peek(address: number): number {
            // special address 
            if (address === Constants.Memory.ZeroPageRandomNumberGenerator) {
                return Math.floor(Math.random() * 0x100); 
            }

            return this.memory[address & 0xFFFF];
        }

        setFlags(value: number): void {
            if (value & Constants.ProcessorStatus.NegativeFlagSet) {
                this.rP |= Constants.ProcessorStatus.NegativeFlagSet;
            }
            else {
                this.rP &= Constants.ProcessorStatus.NegativeFlagReset;
            }
            
            if (value) {
                this.rP &= Constants.ProcessorStatus.ZeroFlagReset;
            }
            else {
                this.rP |= Constants.ProcessorStatus.ZeroFlagSet;
            }            
        }

        compareWithFlags(registerValue: number, value: number): void {
            var result: number = registerValue + value; 

            if (result > Constants.Memory.ByteMask) {
                this.rP |= Constants.ProcessorStatus.CarryFlagSet;
            }
            else {
                this.rP &= Constants.ProcessorStatus.CarryFlagReset;
            }

            this.setFlags(registerValue - value);
        }

        public addrAbsoluteX(): number {
            return (this.addrPopWord() + this.rX) & Constants.Memory.Max;
        }

        public addrAbsoluteY(): number {
            return (this.addrPopWord() + this.rY) & Constants.Memory.Max;
        }

        public addrIndirect(): number {
            var addressLocation: number = this.addrPopWord();
            var newAddress: number = this.peek(addressLocation) + (this.peek(addressLocation + 1) << Constants.Memory.BitsInByte);
            return newAddress & Constants.Memory.Max;
        }

        public addrIndexedIndirectX(): number {
            var zeroPage: number = (this.addrPop() + this.rX) & Constants.Memory.ByteMask;
            var address: number = this.peek(zeroPage) + (this.peek(zeroPage + 1) << Constants.Memory.BitsInByte);
            return address;
        }

        public addrIndirectIndexedY(): number {
            var zeroPage: number = this.addrPop();
            var target: number = this.peek(zeroPage) + (this.peek(zeroPage + 1) << Constants.Memory.BitsInByte)
                + this.rY; 
            return target;
        }

        getOperation(value: number): IOperation {
            return this.operationMap[value & Constants.Memory.ByteMask];                            
        }
    }
}