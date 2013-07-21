var Tests;
(function (Tests) {
    describe("cpu", function () {
        var cpu;
        var console;
        var display;

        function loadInfiniteLoop() {
            cpu.poke(0x200, 0x03);
            cpu.poke(0x201, 0x00);
            cpu.poke(0x202, 0x02);
        }

        beforeEach(function () {
            module("app");
        });

        beforeEach(function () {
            inject(function (consoleService, displayService, $timeout) {
                console = consoleService;
                display = displayService;
                cpu = new Emulator.Cpu(console, display, $timeout);
            });
        });

        afterEach(function () {
            cpu.stop();
        });

        describe("given cpu when constructed", function () {
            it("then should set all default registers", function () {
                expect(cpu.rA).toBe(0x00);
                expect(cpu.rX).toBe(0x00);
                expect(cpu.rY).toBe(0x00);
                expect(cpu.rP).toBe(0x00);
                expect(cpu.rPC).toBe(Constants.Memory.DefaultStart);
                expect(cpu.rSP).toBe(Constants.Memory.Stack);
            });

            it("then should reset all timer information", function () {
                expect(cpu.started).toBe(null);
                expect(cpu.elapsedMilliseconds).toBe(0);
                expect(cpu.instructionsPerSecond).toBe(0);
            });

            it("then should reset running and error states", function () {
                expect(cpu.runningState).toBe(false);
                expect(cpu.errorState).toBe(false);
            });

            it("then should log to the console", function () {
                expect(console.lines.length).toBe(1);
            });
        });

        describe("given cpu that is running when stop called", function () {
            beforeEach(function () {
                loadInfiniteLoop();
            });

            it("then should set running state to false", function () {
                cpu.run();
                var done = false;

                runs(function () {
                    setTimeout(function () {
                        cpu.stop();
                        done = true;
                    }, 10);
                });

                waitsFor(function () {
                    return done;
                }, "Failed to stop the cpu.", 1000);

                runs(function () {
                    expect(cpu.runningState).toBe(false);
                });
            });
        });

        describe("given cpu that is running when run called", function () {
            it("logs to the console that the cpu is already running", function () {
                loadInfiniteLoop();
                var initial = console.lines.length;
                cpu.run();
                var current = console.lines.length;
                expect(current).toBe(initial);
                cpu.run();
                expect(console.lines.length).toBe(current + 1);
                cpu.stop();
            });
        });

        describe("given cpu in error state when run called", function () {
            it("logs to the console that the cpu cannot run", function () {
                var current = console.lines.length;
                loadInfiniteLoop();
                cpu.errorState = true;
                cpu.run();
                expect(console.lines.length).toBe(current + 1);
                expect(cpu.runningState).toBe(false);
            });
        });

        describe("given cpu in valid state when run called", function () {
            beforeEach(function () {
                loadInfiniteLoop();
                cpu.run();
            });

            afterEach(function () {
                cpu.stop();
            });

            it("should set running state to true", function () {
                expect(cpu.runningState).toBe(true);
            });
        });

        describe("given cpu with stack available when stackPush called", function () {
            var result;

            beforeEach(function () {
                result = cpu.stackPush(0x80);
            });

            it("should return true", function () {
                expect(result).toBe(true);
            });

            it("should update the stack pointer", function () {
                expect(cpu.rSP).toBe(0xFF);
            });
        });

        describe("given cpu with no stack available when stackPush called", function () {
            var result;

            beforeEach(function () {
                cpu.rSP = -1;
            });

            it("should throw an exception", function () {
                expect(function () {
                    cpu.stackPush(0x80);
                }).toThrow();
            });
        });

        describe("given cpu with information on stack when stackPop called", function () {
        });

        describe("given cpu with no information on stack when stackPop called", function () {
        });

        describe("given cpu with address on stack when stackRts called", function () {
        });

        describe("given cpu when addressPop called", function () {
        });

        describe("given cpu when addressPopWord called", function () {
        });

        describe("given cpu when poke called with invalid address", function () {
        });

        describe("given cpu when poke called with valid address", function () {
        });

        describe("given cpu when poke called with invalid value", function () {
        });

        describe("given cpu when peek called with invalid address", function () {
        });

        describe("given cpu when peek called with valid address", function () {
        });

        describe("given value with negative bit set when setFlags called", function () {
        });

        describe("given value with negative bit not set when setFlags called", function () {
        });

        describe("given zero value when setFlags called", function () {
        });

        describe("given non-zero value when setFlags called", function () {
        });

        describe("given value without overflow when compareWithFlags called", function () {
        });

        describe("given value with overflow when compareWithFlags called", function () {
        });

        describe("given non-matching values when compareWithFlags called", function () {
        });

        describe("given matching values when compareWithFlags called", function () {
        });

        describe("given value greater than register when compareWithFlags called", function () {
        });

        describe("given value less than reigster when compareWithFlags called", function () {
        });

        describe("given op code value when getOperation called", function () {
        });
    });
})(Tests || (Tests = {}));
