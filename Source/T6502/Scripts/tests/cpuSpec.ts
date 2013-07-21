/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/emulator/cpu.ts'/>

module Tests {

    describe("cpu", () => {

        var cpu: Emulator.ICpu;
        var console: Services.IConsoleService;
        var display: Services.IDisplayService;
        var testValue: number = 0x6E; // some test value 
        var testValue2: number = 0x88; // some test value, also negative
        var testWord: number = 0x1234; // some test address 
        var invalidValue: number = 0x101; // some value out of range
        var invalidAddress: number = 0x10001; // some address out of range
        
        function loadInfiniteLoop() {
            cpu.poke(0x200, 0x03); // $0200: JMP $0200
            cpu.poke(0x201, 0x00);
            cpu.poke(0x202, 0x02);
        }

        function testFlag(mask: number): boolean {
            return Boolean(cpu.rP & mask); 
        }

        beforeEach(() => {
            module("app");
        });

        beforeEach(() => {
            inject( (consoleService: Services.IConsoleService, displayService: Services.IDisplayService, $timeout) => {
                console = consoleService;
                display = displayService;
                cpu = new Emulator.Cpu(console, display, $timeout);
            });
        });

        afterEach(() => {
            cpu.stop();                       
        });

        describe("given cpu when constructed", () => {
            it("then should set all default registers", () => {        
                expect(cpu.rA).toBe(0x00);
                expect(cpu.rX).toBe(0x00);
                expect(cpu.rY).toBe(0x00);
                expect(cpu.rP).toBe(0x00);
                expect(cpu.rPC).toBe(Constants.Memory.DefaultStart);
                expect(cpu.rSP).toBe(Constants.Memory.Stack);            
            });

            it("then should reset all timer information", () => {
                expect(cpu.started).toBe(null);
                expect(cpu.elapsedMilliseconds).toBe(0);
                expect(cpu.instructionsPerSecond).toBe(0);                
            });

            it("then should reset running and error states", () => {
                expect(cpu.runningState).toBe(false);
                expect(cpu.errorState).toBe(false);
            });

            it("then should log to the console", () => {
                expect(console.lines.length).toBe(1);
            });
        });
        
        describe("given cpu that is running when stop called", () => {

            beforeEach(() => {
                loadInfiniteLoop();
            });

            it("then should set running state to false", () => {
                cpu.run();
                var done: boolean = false; 

                runs(() => {
                    setTimeout(() => {
                        cpu.stop();
                        done = true;
                    }, 10);
                });

                waitsFor(() => done, "Failed to stop the cpu.", 1000);

                runs(() => {
                    expect(cpu.runningState).toBe(false);                    
                });
            });
        });        

        describe("given cpu that is running when run called", () => {

            it("then logs to the console that the cpu is already running", () => {
                loadInfiniteLoop();
                var initial: number = console.lines.length;
                cpu.run(); 
                var current: number = console.lines.length;
                expect(current).toBe(initial);
                cpu.run(); 
                expect(console.lines.length).toBe(current + 1);
                cpu.stop();
            });
        });

        describe("given cpu in error state when run called", () => {
            it("then logs to the console that the cpu cannot run", () => {
                var current: number = console.lines.length;
                loadInfiniteLoop();
                cpu.errorState = true;
                cpu.run(); 
                expect(console.lines.length).toBe(current + 1);
                expect(cpu.runningState).toBe(false);
            });
        });

        describe("given cpu in valid state when run called", () => {
            
            beforeEach(() => {
                loadInfiniteLoop();
                cpu.run();
            });

            afterEach(() => {
                cpu.stop();
            });
            
            it("then should set running state to true", () => {
                expect(cpu.runningState).toBe(true);
            });            
        });

        describe("given cpu with stack available when stackPush called", () => {

            var result: boolean; 

            beforeEach(() => {
                result = cpu.stackPush(testValue);
            });

            it("then should return true", () => {
                expect(result).toBe(true);
            });

            it("then should update the stack pointer", () => {
                expect(cpu.rSP).toBe(0xFF);
            });

        });

        describe("given cpu with no stack available when stackPush called", () => {

            var result: boolean; 

            beforeEach(() => {
                cpu.rSP = -1;
            });

            it("then should throw an exception", () => {
                expect(() => {
                    cpu.stackPush(testValue); 
                }).toThrow();
            });
        });

        describe("given cpu with information on stack when stackPop called", () => {

            beforeEach(() => {
                cpu.stackPush(testValue);
                cpu.stackPush(testValue2);
            });

            it("then should return the last value on the stack", () => {
                var actual: number = cpu.stackPop();
                expect(actual).toBe(testValue2);
            });

        });

        describe("given cpu with no information on stack when stackPop called", () => {
            it("then should throw an exception", () => {
                expect(() => {
                    var actual: number = cpu.stackPop();
                }).toThrow();
            });
        });

        describe("given cpu with address on stack when stackRts called", () => {

            beforeEach(() => {
                var addressAdjusted: number = testWord - 1; 
                cpu.stackPush((addressAdjusted >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);
                cpu.stackPush(addressAdjusted & Constants.Memory.ByteMask);
            });

            it("then should set the program counter to 1 more than the address that was popped", () => {
                cpu.stackRts();
                expect(cpu.rPC).toBe(testWord);
            });
        });

        describe("given cpu when addressPop called", () => {

            beforeEach(() => {
                cpu.poke(cpu.rPC, testValue);                
            });

            it("then should pop the value at that address", () => {
                var actual: number = cpu.addrPop();
                expect(actual).toBe(testValue);
            });

        });

        describe("given cpu when addressPopWord called", () => {

            beforeEach(() => {
                cpu.poke(cpu.rPC, testWord & Constants.Memory.ByteMask);
                cpu.poke(cpu.rPC + 1, (testWord >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask); 
            });

            it("then should pop the word at that address", () => {
                var actual: number = cpu.addrPopWord();
                expect(actual).toBe(testWord);
            });
        });
        
        describe("given cpu when poke called with invalid address", () => {
            beforeEach(() => {
                cpu.poke(invalidAddress, testValue);
            });

            it("then should mask the invalid address to the valid range and set the address to the value", () => {
                var actual: number = cpu.peek(invalidAddress & Constants.Memory.Max);
                expect(actual).toBe(testValue);
            });

        });

        describe("given cpu when poke called with valid address", () => {
            beforeEach(() => {
                cpu.poke(testWord, testValue);
            });

            it("then should set the address to the value", () => {
                var actual: number = cpu.peek(testWord);
                expect(actual).toBe(testValue);
            });

        });
        
        describe("given cpu when poke called with invalid value", () => {

            beforeEach(() => {
                cpu.poke(testWord, invalidValue);
            });

            it("then should mask the value to the valid range and set the address to the masked value", () => {
                var actual: number = cpu.peek(testWord);
                expect(actual).toBe(invalidValue & Constants.Memory.ByteMask);
            });
        });
        
        describe("given cpu when peek called with invalid address", () => {
            beforeEach(() => {
                cpu.poke(invalidAddress, testValue);
            });

            it("then should mask the address to a valid range and return the byte at the masked address" ,() => {
                var actual: number = cpu.peek(invalidAddress);
                expect(actual).toBe(testValue);
            });
        });

        describe("given cpu when peek called with valid address", () => {
            beforeEach(() => {
                cpu.poke(testWord, testValue);
            });
            it("then should return the value at that address", () => {
                var actual: number = cpu.peek(testWord);
                expect(actual).toBe(testValue);
            });
        });

        describe("special memory scenarios", () => {

            describe("given cpu when display memory address is updated", () => {

                beforeEach(() => {
                    cpu.poke(Constants.Display.DisplayStart + 0x2, testValue);
                });

                it("then should update the display with the corresponding value", () => {
                    var actual: number = display.pixels[0x2];
                    expect(actual).toBe(testValue);
                });

            });

            describe("given cpu when peek called at the memory address of the random number generator", () => {
                it("then should return a random value between 0 and 255", () => {
                    var randomNumbers: number[] = [];
                    var idx: number;
                    for (idx = 0; idx < 10; idx++) {
                        var value: number = cpu.peek(Constants.Memory.ZeroPageRandomNumberGenerator);
                        expect(value).toBeGreaterThan(-1);
                        expect(value).toBeLessThan(0x100);
                        randomNumbers.push(value);
                    }
                    randomNumbers.sort();                    
                    expect(randomNumbers[0]).toNotBe(randomNumbers[randomNumbers.length-1]);
                });
            });        
        });
                
        describe("given value with negative bit set when setFlags called", () => {
            beforeEach(() => {
                cpu.setFlags(testValue2);
            });

            it("then should set the negative flag", () => {
                expect(testFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(true);
            });
        }); 

        describe("given value with negative bit not set when setFlags called", () => {
            beforeEach(() => {
                cpu.setFlags(testValue);
            });

            it("then should reset the negative flag", () => {
                expect(testFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(false);
            });
        });
        
        describe("given zero value when setFlags called", () => {
            beforeEach(() => {
                cpu.setFlags(0);
            });

            it("then should set the zero flag", () => {
                expect(testFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(true);
            });
        }); 

        describe("given non-zero value when setFlags called", () => {
            beforeEach(() => {
                cpu.setFlags(testValue);
            });

            it("then should reset the zero flag", () => {
                expect(testFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(false);
            });
        }); 

        describe("given value without overflow when compareWithFlags called", () => {
        }); 

        describe("given value with overflow when compareWithFlags called", () => {
        }); 

        describe("given non-matching values when compareWithFlags called", () => {
        }); 

        describe("given matching values when compareWithFlags called", () => {
        }); 

        describe("given value greater than register when compareWithFlags called", () => {
        }); 

        describe("given value less than register when compareWithFlags called", () => {
        }); 

        describe("given op code value when getOperation called", () => {
        }); 
        
    });
}