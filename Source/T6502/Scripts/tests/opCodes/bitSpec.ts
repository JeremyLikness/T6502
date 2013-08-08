/// <reference path='../jasmine.d.ts'/>
/// <reference path='../../app/defs/angular.d.ts'/>
/// <reference path='../angular-mocks.d.ts'/>
/// <reference path='../../app/defs/jquery.d.ts'/>
/// <reference path='../../app/app.ts'/>
/// <reference path='../../app/services/cpuService.ts'/>
/// <reference path='../../app/services/consoleService.ts'/>
/// <reference path='../../app/emulator/compiler.ts'/>
/// <reference path='../../app/emulator/opCodes.ts'/>

module Tests {

    export interface IBitTest {
        value: number; 
        accumulator: number;
        it: string;
        zeroFlag: boolean; 
        negativeFlag: boolean; 
        overflowFlag: boolean; 
    }

    var address: number = 0xC000;
    var zeroPage: number = 0x0;

    var tests: IBitTest[] = [ {
        value: 0x01, 
        accumulator: 0x01,
        it: "when value & accumulator not zero then should not set zero flag",
        zeroFlag: false,
        negativeFlag: false,
        overflowFlag: false
    }, {
        value: 0x01, 
        accumulator: 0x00,
        it: "when value & accumulator zero then should set zero flag",
        zeroFlag: true,
        negativeFlag: false,
        overflowFlag: false
    }, {
        value: Constants.ProcessorStatus.NegativeFlagSet, 
        accumulator: 0xFF,
        it: "when value has negative flag set then should set negative flag",
        zeroFlag: false,
        negativeFlag: true,
        overflowFlag: false
    }, {
        value: Constants.ProcessorStatus.OverflowFlagSet, 
        accumulator: 0xFF,
        it: "when value has overflow flag set then should set overflow flag",
        zeroFlag: false,
        negativeFlag: false,
        overflowFlag: true
    }, {
        value: Constants.ProcessorStatus.NegativeFlagSet | Constants.ProcessorStatus.OverflowFlagSet, 
        accumulator: 0xFF,
        it: "when value has negative and overflow flag set then should set both flags",
        zeroFlag: false,
        negativeFlag: true,
        overflowFlag: true
    }    
    ];

    describe("BIT - test bits", () => {

        var cpuSvc: Services.ICpuService;
        var cpu: Emulator.ICpu;
        var consoleSvc: Services.IConsoleService;
        var operation: Emulator.IOperation;

        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject((cpuService, consoleService) => {
                cpuSvc = cpuService;
                consoleSvc = consoleService;
                cpu = cpuSvc.getCpu();                
            });
        });

        describe("BIT Absolute", () => {

            var idx: number;

            beforeEach(() => {
                operation = new Emulator.BitAbsolute();
                cpu.poke(cpu.rPC, address & Constants.Memory.ByteMask);
                cpu.poke(cpu.rPC+1, (address >> Constants.Memory.BitsInByte) & Constants.Memory.ByteMask);                
            });

            for(idx = 0; idx < tests.length; idx++) {
            
                var test = tests[idx];

                var testFunction = (testItem: IBitTest) => {
                    it(testItem.it, () => {                    
                        cpu.poke(address, testItem.value);
                        cpu.rA = testItem.accumulator;
                        operation.execute(cpu);
                        expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(testItem.zeroFlag);
                        expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(testItem.negativeFlag);
                        expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(testItem.overflowFlag);
                    });
                }

                testFunction(test);            
            }            
        });

        describe("BIT Zero Page", () => {

            var idx: number;

            beforeEach(() => {
                operation = new Emulator.BitZeroPage();
                cpu.poke(cpu.rPC, zeroPage);                
            });

            for(idx = 0; idx < tests.length; idx++) {
            
                var test = tests[idx];

                var testFunction = (testItem: IBitTest) => {
                    it(testItem.it, () => {                    
                        cpu.poke(zeroPage, testItem.value);
                        cpu.rA = testItem.accumulator;
                        operation.execute(cpu);
                        expect(cpu.checkFlag(Constants.ProcessorStatus.ZeroFlagSet)).toBe(testItem.zeroFlag);
                        expect(cpu.checkFlag(Constants.ProcessorStatus.NegativeFlagSet)).toBe(testItem.negativeFlag);
                        expect(cpu.checkFlag(Constants.ProcessorStatus.OverflowFlagSet)).toBe(testItem.overflowFlag);
                    });
                }

                testFunction(test);            
            }            
        });
    });
}