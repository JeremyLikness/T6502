///<reference path="../app.ts"/>
///<reference path="../services/consoleService.ts"/>
///<reference path="../services/displayService.ts"/>
///<reference path="opCodes.ts"/>

module Emulator {

    export interface ICpu {
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
    }

    export interface ICpuExtended extends ICpu {
        getOperation(value: number): IOperation;        
    }

    export class Cpu implements ICpuExtended {
            
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

            // hack for a miniature program to display the palette 
            var program = [ 
                0xa9, 0xe1, // LDA #$E1
                0x85, 0x00, // STA $0
                0xa9, 0xFB, // LDA #$FB 
                0x85, 0x01, // STA $1 
                0xa0, 0x20, // LDY #$20 
                0xA2, 0x00, // WRITE: LDX #$00 
                0x41, 0x00, // EOR ($0, X)
                0x91, 0x00, // STA ($0), Y 
                0xE6, 0x00, // INC $0 
                0xD0, 0xF6, // BNE WRITE 
                0xE6, 0x01, // INC $1 
                0xD0, 0xF2, // BNE WRITE 
                0xA2, 0x00,  // LDX #$00
                0xFE, 0x00, 0xFC, // CYCLE: INC $FC00, X 
                0xFE, 0x00, 0xFD, // INC $FD00, X 
                0xFE, 0x00, 0xFE, // INC $FE00, X 
                0xFE, 0x00, 0xFF, // INC $FF00, X 
                0xE8,             // INX   
                0x4C, 0x1A, 0x02  // JMP CYCLE 
            ];
            for (idx = 0; idx < program.length; idx++) {
                this.poke(Constants.Memory.DefaultStart + idx, program[idx]);
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
                this.operationMap[this.addrPop()].execute(this);                
            }
            catch(exception) {
                this.consoleService.log("Unexpected exception: " + exception);
                this.halt();
            }

            // track instructions per second 
            this.instructions += 1;                                  
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
            this.memory[address] = value;
            if (address >= 0xF000 && address <= 0xFFFF) {
                this.displayService.draw(address, value);
            }
        }

        peek(address: number): number {
            // special addresse 
            if (address === 0xFD) {
                return Math.floor(Math.random() * 0x100); 
            }

            return this.memory[address];
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

        getOperation(value: number): IOperation {
            return this.operationMap[value & Constants.Memory.ByteMask];                            
        }
    }
}