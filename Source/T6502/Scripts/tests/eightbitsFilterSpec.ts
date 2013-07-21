/// <reference path='jasmine.d.ts'/>
/// <reference path='../app/defs/angular.d.ts'/>
/// <reference path='angular-mocks.d.ts'/>
/// <reference path='../app/defs/jquery.d.ts'/>
/// <reference path='../app/app.ts'/>
/// <reference path='../app/filters/eightbits.ts'/>

module Tests {

    describe("eightbits filter", () => {
  
        var filter: any;

        beforeEach(() => {    
            module('app');          
        });

        beforeEach(() => {
            inject(($filter) => {
                filter = $filter('eightbits');
            });
        });

        describe("given invalid input when called", () => {
            it("then should return the value back", () => {        
                expect(filter('zoo')).toEqual('zoo');                
            });
        });

        describe("given valid input when called", () => {
          
            it("then should return the bits for the number", () => {
                expect(filter(0xff)).toEqual('11111111');                
            });
            
            it("with smaller number then should pad bits to 8 places", () => {
                expect(filter(0x01)).toEqual('00000001');                
            });          
        });
    });
}