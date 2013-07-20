/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/globalConstants.ts'/>
/// <reference path='../app/services/displayService.ts'/>

module Tests {

    describe("display service", () => {

        var validAddress: number = Constants.Display.Max;
        var invalidAddress: number = Constants.Display.Max + 1;
        var validValue: number = Constants.Memory.ByteMask;
        var invalidValue: number = Constants.Memory.ByteMask + 1;
        var displaySvc: Services.IDisplayService;
  
        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject((displayService) => {
                displaySvc = displayService;
            });
        });

        describe("given display service when called", () => {

            it("then should initialize the pixels array", () => {        
                expect(displaySvc.pixels).toBeDefined();
                expect(displaySvc.pixels.length).toBe(Constants.Display.Size);
            });

            it("then should set the callback to null", () => {        
                expect(displaySvc.callback).toBeNull();                
            });

        });

        describe("given no callback when draw method is called", () => {          

            beforeEach(() => {
                displaySvc.draw(validAddress, validValue);
            });

            it("then should not throw an exception", () => {
                expect(displaySvc.pixels[validAddress]).toBe(validValue);
            });
        });

        describe("given callback when draw method is called", () => {

            var addressCallback: number = -1;
            var valueCallback: number = -1;

            beforeEach(() => {
                displaySvc.callback = (address: number, value: number) => {
                    addressCallback = address;
                    valueCallback = value;
                };
                displaySvc.draw(validAddress, validValue);
            });

            it("then should call the callback with the address and value", () => {
                expect(addressCallback).toBe(validAddress);
                expect(valueCallback).toBe(validValue);
            });    
        });

        describe("given invalid address when draw method is called", () => {

            beforeEach(() => {
                displaySvc.draw(invalidAddress, validValue);
            });

            it("then should mask the address to a valid value", () => {
                expect(displaySvc.pixels[invalidAddress & Constants.Display.Max])
                    .toBe(validValue);
            });
        });

        describe("given invalid value when draw method is called", () => {

            beforeEach(() => {
                displaySvc.draw(validAddress, invalidValue);
            });

            it("then should mask the value to a valid value", () => {
                expect(displaySvc.pixels[validAddress]).toBe(invalidValue & Constants.Memory.ByteMask);
            });
        });

        describe("given valid address and value when draw method is called", () => {
            
            beforeEach(() => {
                displaySvc.draw(validAddress, validValue);
            });

            it("then should set the address to the value", () => {
                expect(displaySvc.pixels[validAddress]).toBe(validValue);
            });
        });
    });
}