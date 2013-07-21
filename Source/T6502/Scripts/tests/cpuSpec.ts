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
        
        function loadInfiniteLoop() {
            cpu.poke(0x200, 0x03);
            cpu.poke(0x201, 0x00);
            cpu.poke(0x202, 0x02);
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

            it("logs to the console that the cpu is already running", () => {
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
            it("logs to the console that the cpu cannot run", () => {
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
            
            it("should set running state to true", () => {
                expect(cpu.runningState).toBe(true);
            });            
        });

        describe("given cpu with stack available when stackPush called", () => {

            var result: boolean; 

            beforeEach(() => {
                result = cpu.stackPush(0x80);
            });

            it("should return true", () => {
                expect(result).toBe(true);
            });

            it("should update the stack pointer", () => {
                expect(cpu.rSP).toBe(0xFF);
            });

        });

        describe("given cpu with no stack available when stackPush called", () => {

            var result: boolean; 

            beforeEach(() => {
                cpu.rSP = -1;
            });

            it("should throw an exception", () => {
                expect(() => {
                    cpu.stackPush(0x80); 
                }).toThrow();
            });
        });

        describe("given cpu with information on stack when stackPop called", () => {
        });

        describe("given cpu with no information on stack when stackPop called", () => {
        });

        describe("given cpu with address on stack when stackRts called", () => {
        });

        describe("given cpu when addressPop called", () => {
        });

        describe("given cpu when addressPopWord called", () => {
        });
        
        describe("given cpu when poke called with invalid address", () => {
        });

        describe("given cpu when poke called with valid address", () => {
        });
        
        describe("given cpu when poke called with invalid value", () => {
        });
        
        describe("given cpu when peek called with invalid address", () => {
        });

        describe("given cpu when peek called with valid address", () => {
        });
                
        describe("given value with negative bit set when setFlags called", () => {
        }); 

        describe("given value with negative bit not set when setFlags called", () => {
        });
        
        describe("given zero value when setFlags called", () => {
        }); 

        describe("given non-zero value when setFlags called", () => {
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

        describe("given value less than reigster when compareWithFlags called", () => {
        }); 

        describe("given op code value when getOperation called", () => {
        }); 

    });
}