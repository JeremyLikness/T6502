var Emulator;
(function (Emulator) {
    var Cpu = (function () {
        function Cpu(consoleService, displayService, timeoutService) {
            var _this = this;
            this.memory = new Array(Constants.Memory.Size);
            this.runner = null;
            this.instructions = 0;
            this.lastCheck = 0;
            this.operationMap = [];
            this.consoleService = consoleService;
            this.displayService = displayService;
            this.log = function (msg) {
                return _this.consoleService.log(msg);
            };
            this.timeoutService = timeoutService;
            Emulator.OpCodes.FillOps(this.operationMap);
            this.autoRefresh = true;
            this.reset();
        }
        Cpu.prototype.stop = function () {
            this.runningState = false;

            if (this.runner != null) {
                this.timeoutService.cancel(this.runner);
                this.runner = null;
            }
        };

        Cpu.prototype.halt = function () {
            this.stop();
            this.errorState = true;
            this.consoleService.log("Processing has been halted. RESET to continue.");
        };

        Cpu.prototype.reset = function () {
            var idx;

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

            for (idx = 0; idx < this.displayService.pixels.length; idx++) {
                if (this.displayService.pixels[idx] !== 0x0) {
                    this.displayService.draw(idx, 0x0);
                }
            }

            this.runningState = false;
            this.errorState = false;

            this.consoleService.log("CPU has been successfully reset.");
        };

        Cpu.prototype.run = function () {
            var _this = this;
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

            this.runner = this.timeoutService(function () {
                return _this.executeBatch.apply(_this);
            }, 1, this.autoRefresh);
        };

        Cpu.prototype.executeBatch = function () {
            var _this = this;
            if (!this.runningState || this.errorState) {
                return;
            }

            var instructions = 0xff;
            while (instructions--) {
                this.execute();
            }

            this.runner = this.timeoutService(function () {
                return _this.executeBatch.apply(_this);
            }, 0, this.autoRefresh);

            var now = new Date();
            this.elapsedMilliseconds = now.getTime() - this.started.getTime();

            if (now.getTime() - this.lastCheck > 1000) {
                this.instructionsPerSecond = this.instructions;
                this.instructions = 0;
                this.lastCheck = now.getTime();
            }
        };

        Cpu.prototype.execute = function () {
            if (!this.runningState || this.errorState) {
                return;
            }

            try  {
                this.operationMap[this.addrPop()].execute(this);
            } catch (exception) {
                this.consoleService.log("Unexpected exception: " + exception);
                this.halt();
            }

            this.instructions += 1;
        };

        Cpu.prototype.checkFlag = function (flag) {
            return (this.rP & flag) > 0;
        };

        Cpu.prototype.setFlag = function (flag, setFlag) {
            var resetFlag = Constants.Memory.ByteMask - flag;
            if (setFlag) {
                this.rP |= flag;
            } else {
                this.rP &= resetFlag;
            }
        };

        Cpu.prototype.stackPush = function (value) {
            if (this.rSP >= 0x0) {
                this.rSP -= 1;
                this.memory[this.rSP + Constants.Memory.Stack] = value;
                return true;
            } else {
                throw "Stack overflow.";
                return false;
            }
        };

        Cpu.prototype.stackPop = function () {
            if (this.rSP < Constants.Memory.Stack) {
                var value = this.memory[this.rSP + Constants.Memory.Stack];
                this.rSP++;
                return value;
            } else {
                throw "Tried to pop empty stack.";
                return 0;
            }
        };

        Cpu.prototype.stackRts = function () {
            this.rPC = this.stackPop() + 0x01 + (this.stackPop() << Constants.Memory.BitsInByte);
        };

        Cpu.prototype.addrPop = function () {
            var value = this.peek(this.rPC);
            this.rPC += 1;
            return value;
        };

        Cpu.prototype.addrPopWord = function () {
            var word = this.addrPop() + (this.addrPop() << Constants.Memory.BitsInByte);
            return word;
        };

        Cpu.prototype.poke = function (address, value) {
            this.memory[address & Constants.Memory.Max] = value & Constants.Memory.ByteMask;
            if (address >= Constants.Display.DisplayStart && address <= Constants.Display.DisplayStart + Constants.Display.Max) {
                this.displayService.draw(address, value);
            }
        };

        Cpu.prototype.peek = function (address) {
            if (address === Constants.Memory.ZeroPageRandomNumberGenerator) {
                return Math.floor(Math.random() * 0x100);
            }

            return this.memory[address & 0xFFFF];
        };

        Cpu.prototype.setFlags = function (value) {
            if (value & Constants.ProcessorStatus.NegativeFlagSet) {
                this.rP |= Constants.ProcessorStatus.NegativeFlagSet;
            } else {
                this.rP &= Constants.ProcessorStatus.NegativeFlagReset;
            }

            if (value) {
                this.rP &= Constants.ProcessorStatus.ZeroFlagReset;
            } else {
                this.rP |= Constants.ProcessorStatus.ZeroFlagSet;
            }
        };

        Cpu.prototype.compareWithFlags = function (registerValue, value) {
            var result = registerValue + value;

            if (result > Constants.Memory.ByteMask) {
                this.rP |= Constants.ProcessorStatus.CarryFlagSet;
            } else {
                this.rP &= Constants.ProcessorStatus.CarryFlagReset;
            }

            this.setFlags(registerValue - value);
        };

        Cpu.prototype.getOperation = function (value) {
            return this.operationMap[value & Constants.Memory.ByteMask];
        };
        return Cpu;
    })();
    Emulator.Cpu = Cpu;
})(Emulator || (Emulator = {}));
